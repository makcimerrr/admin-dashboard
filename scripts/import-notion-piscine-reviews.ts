#!/usr/bin/env tsx
/**
 * Import des bilans de piscine depuis Notion → `piscine_project_reviews` et
 * `piscine_candidate_comments`.
 *
 * Source : la base « Données Utilisateurs (Auto) » — la même que pour les
 * alternants. C'est elle qui porte les audits de piscine, pas la page « Bilan
 * de piscine » : celle-ci ne contient que deux bilans 2024 au format ancien, et
 * la base que son sommaire référence est une VUE LIÉE, qui n'expose rien par
 * l'API.
 *
 * Colonnes reprises :
 *
 *   Audit Quad (GO)         → compte rendu du projet `quad`
 *   Audit Sudoku (GO)       → compte rendu du projet `sudoku`
 *   Audit Quad Checker (GO) → compte rendu du projet `quadchecker`
 *   Commentaire (GO)        → commentaire libre sur le candidat
 *
 * `Date piscine` désigne la session : c'est ce qui permet de rattacher un audit
 * au bon passage, un candidat pouvant repasser une piscine.
 *
 * Usage :
 *   pnpm tsx scripts/import-notion-piscine-reviews.ts --inspect   # schéma réel
 *   pnpm tsx scripts/import-notion-piscine-reviews.ts             # dry-run
 *   pnpm tsx scripts/import-notion-piscine-reviews.ts --apply     # écrit
 *   pnpm tsx scripts/import-notion-piscine-reviews.ts --page <id> # autre racine
 *
 * Prérequis : la page doit être partagée avec l'intégration de `NOTION_TOKEN`
 * (Notion → page → ⋯ → Connexions). Sans ce partage, l'API répond 404.
 *
 * Rien n'est supprimé : un compte rendu déjà saisi dans le hub n'est pas écrasé
 * (l'import ne remplit que les emplacements vides), et les lignes Notion sans
 * candidat correspondant sont listées plutôt qu'ignorées en silence.
 */

import 'dotenv/config';
import { Client, isNotionClientError } from '@notionhq/client';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { and, eq } from 'drizzle-orm';
import {
  piscineCandidateComments,
  piscineCandidates,
  piscineProjectReviews,
  piscineSessions,
} from '../lib/db/schema/piscines';

/** Base « Données Utilisateurs (Auto) » (zone01rouen). */
const DEFAULT_ROOT = 'efb33fd9ecb74a8d9c0778ef48421d54';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const apply = process.argv.includes('--apply');
const inspectOnly = process.argv.includes('--inspect');
const rootId = arg('page') ?? process.env.NOTION_PISCINE_BILAN_ID ?? DEFAULT_ROOT;

if (!process.env.NOTION_TOKEN) {
  console.error('❌ NOTION_TOKEN absent de l’environnement.');
  process.exit(1);
}

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
const db = drizzle(pool);

type AnyProp = Record<string, any>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function norm(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Rend une propriété Notion en texte, quel que soit son type. */
function plain(prop: AnyProp | undefined): string {
  if (!prop) return '';
  switch (prop.type) {
    case 'title':
    case 'rich_text':
      return (prop[prop.type] ?? []).map((t: AnyProp) => t.plain_text ?? '').join('').trim();
    case 'select':
      return prop.select?.name ?? '';
    case 'status':
      return prop.status?.name ?? '';
    case 'multi_select':
      return (prop.multi_select ?? []).map((o: AnyProp) => o.name).join(', ');
    case 'people':
      return (prop.people ?? []).map((p: AnyProp) => p.name ?? '').join(', ');
    case 'email':
      return prop.email ?? '';
    case 'url':
      return prop.url ?? '';
    case 'date':
      return prop.date?.start ?? '';
    case 'number':
      return prop.number != null ? String(prop.number) : '';
    case 'formula':
      return plain({
        type: prop.formula?.type,
        [prop.formula?.type]: prop.formula?.[prop.formula?.type],
      });
    case 'rollup':
      if (prop.rollup?.type === 'array') {
        return (prop.rollup.array ?? []).map((p: AnyProp) => plain(p)).filter(Boolean).join(', ');
      }
      return plain({
        type: prop.rollup?.type,
        [prop.rollup?.type]: prop.rollup?.[prop.rollup?.type],
      });
    default:
      return '';
  }
}

/** Retrouve une propriété par nom, en tolérant accents, casse et ponctuation. */
function findProp(props: AnyProp, ...aliases: string[]): AnyProp | undefined {
  const index = new Map<string, AnyProp>();
  for (const [key, value] of Object.entries(props)) index.set(norm(key), value);
  for (const alias of aliases) {
    const hit = index.get(norm(alias));
    if (hit) return hit;
  }
  for (const alias of aliases) {
    const needle = norm(alias);
    for (const [key, value] of index) if (key.includes(needle)) return value;
  }
  return undefined;
}

function text(props: AnyProp, ...aliases: string[]): string {
  return plain(findProp(props, ...aliases)).trim();
}

/** Colonnes Notion → projet du hub. */
const PROJECT_COLUMNS: { project: string; aliases: string[] }[] = [
  { project: 'quad', aliases: ['Audit Quad (GO)', 'audit quad go', 'audit quad'] },
  { project: 'sudoku', aliases: ['Audit Sudoku (GO)', 'audit sudoku go', 'audit sudoku'] },
  {
    project: 'quadchecker',
    aliases: ['Audit Quad Checker (GO)', 'audit quad checker go', 'audit quadchecker'],
  },
];

// ─── Découverte des bases ────────────────────────────────────────────────────

interface SourceRef {
  dataSourceId: string;
  title: string;
}

const linkedViews: string[] = [];

async function discoverDataSources(id: string, depth = 0): Promise<SourceRef[]> {
  const found: SourceRef[] = [];
  if (depth > 3) return found;

  const addDatabase = async (databaseId: string, fallbackTitle = '') => {
    const database = (await notion.databases.retrieve({ database_id: databaseId })) as AnyProp;
    const title =
      (database.title ?? []).map((t: AnyProp) => t.plain_text).join('') || fallbackTitle;
    const sources = database.data_sources ?? [];
    if (sources.length === 0) {
      linkedViews.push(title || databaseId);
      return;
    }
    for (const ds of sources) found.push({ dataSourceId: ds.id, title: ds.name || title });
  };

  // L'ID est-il déjà une base ?
  if (depth === 0) {
    try {
      await addDatabase(id);
      if (found.length) return found;
    } catch (e) {
      if (!isNotionClientError(e)) throw e;
    }
  }

  let cursor: string | undefined;
  do {
    const res = (await notion.blocks.children.list({
      block_id: id,
      start_cursor: cursor,
      page_size: 100,
    })) as AnyProp;
    for (const block of res.results as AnyProp[]) {
      if (block.type === 'child_database') {
        await addDatabase(block.id, block.child_database?.title ?? '');
      } else if (block.type === 'child_page' || block.has_children) {
        found.push(...(await discoverDataSources(block.id, depth + 1)));
      }
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  return found;
}

/**
 * Ne rapatrie que les lignes portant au moins un audit ou un commentaire GO :
 * la base compte plus de 5 000 candidats, la balayer entière serait inutile.
 * Si les colonnes n'existent pas (autre base ciblée), on lit tout.
 */
function buildFilter(schema: AnyProp): AnyProp | undefined {
  const columns = [
    'Audit Quad (GO)',
    'Audit Sudoku (GO)',
    'Audit Quad Checker (GO)',
    'Commentaire (GO)',
  ].filter((c) => Object.keys(schema).includes(c));

  if (columns.length === 0) return undefined;
  return { or: columns.map((property) => ({ property, rich_text: { is_not_empty: true } })) };
}

async function queryAll(dataSourceId: string): Promise<AnyProp[]> {
  const schema = ((await notion.dataSources.retrieve({ data_source_id: dataSourceId })) as AnyProp)
    .properties as AnyProp;
  const filter = buildFilter(schema);

  const rows: AnyProp[] = [];
  let cursor: string | undefined;
  do {
    const res = (await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      page_size: 100,
      ...(filter ? { filter: filter as never } : {}),
    })) as AnyProp;
    rows.push(...(res.results as AnyProp[]));
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return rows;
}

// ─── Rapprochement avec les candidats du hub ─────────────────────────────────

interface HubCandidate {
  id: number;
  login: string;
  firstName: string | null;
  lastName: string | null;
  sessionEventId: number;
  sessionLabel: string;
}

interface HubSession {
  eventId: number;
  label: string;
  startAt: Date | null;
  endAt: Date | null;
}

async function loadCandidates() {
  const [candidates, sessions] = await Promise.all([
    db
      .select({
        id: piscineCandidates.id,
        login: piscineCandidates.login,
        firstName: piscineCandidates.firstName,
        lastName: piscineCandidates.lastName,
        sessionEventId: piscineCandidates.sessionEventId,
        sessionLabel: piscineSessions.label,
      })
      .from(piscineCandidates)
      .innerJoin(piscineSessions, eq(piscineSessions.eventId, piscineCandidates.sessionEventId)),
    db
      .select({
        eventId: piscineSessions.eventId,
        label: piscineSessions.label,
        startAt: piscineSessions.startAt,
        endAt: piscineSessions.endAt,
      })
      .from(piscineSessions),
  ]);

  /** (session, clé) → candidats. La clé est un login ou un nom normalisé. */
  const bySessionKey = new Map<string, HubCandidate[]>();
  const byLogin = new Map<string, HubCandidate[]>();
  const push = (map: Map<string, HubCandidate[]>, key: string, c: HubCandidate) => {
    if (!key.trim()) return;
    const list = map.get(key) ?? [];
    list.push(c);
    map.set(key, list);
  };

  for (const c of candidates as HubCandidate[]) {
    push(byLogin, norm(c.login), c);
    for (const key of [
      norm(c.login),
      norm(`${c.firstName ?? ''} ${c.lastName ?? ''}`),
      norm(`${c.lastName ?? ''} ${c.firstName ?? ''}`),
    ]) {
      push(bySessionKey, `${c.sessionEventId}|${key}`, c);
    }
  }

  return { bySessionKey, byLogin, sessions: sessions as HubSession[], all: candidates.length };
}

type CandidateIndex = Awaited<ReturnType<typeof loadCandidates>>;

/** Session dont les dates encadrent la date de piscine indiquée dans Notion. */
function sessionForDate(date: Date, sessions: HubSession[]): HubSession | null {
  const t = date.getTime();
  const exact = sessions.find((s) => s.startAt && s.startAt.toISOString().slice(0, 10) === date.toISOString().slice(0, 10));
  if (exact) return exact;
  return (
    sessions.find(
      (s) => s.startAt && s.endAt && t >= s.startAt.getTime() && t <= s.endAt.getTime(),
    ) ?? null
  );
}

/**
 * Rapproche une ligne Notion d'un candidat du hub.
 *
 * `Date piscine` désigne la session : c'est le rapprochement le plus sûr, un
 * candidat pouvant repasser une piscine. À défaut, on n'accepte un login que
 * s'il est unique dans toute la base — on ne devine pas la session.
 */
function resolveCandidate(
  props: AnyProp,
  index: CandidateIndex,
): { candidate: HubCandidate | null; reason?: string } {
  const login = text(props, 'login', 'identifiant', 'pseudo');
  const name = [text(props, 'prenom'), text(props, 'nom')].filter(Boolean).join(' ');
  const dateRaw = text(props, 'Date piscine', 'date piscine');
  const label = login || name || '(sans identité)';

  const date = dateRaw ? new Date(dateRaw) : null;
  const session = date && !Number.isNaN(date.getTime())
    ? sessionForDate(date, index.sessions)
    : null;

  if (session) {
    for (const key of [norm(login), norm(name)]) {
      if (!key) continue;
      const hits = index.bySessionKey.get(`${session.eventId}|${key}`) ?? [];
      if (hits.length === 1) return { candidate: hits[0] };
      if (hits.length > 1) return { candidate: null, reason: `${label} — plusieurs fois dans ${session.label}` };
    }
    return { candidate: null, reason: `${label} — absent de la session ${session.label}` };
  }

  // Pas de date exploitable : un login unique dans toute la base fait foi.
  const hits = login ? (index.byLogin.get(norm(login)) ?? []) : [];
  if (hits.length === 1) return { candidate: hits[0] };
  if (hits.length > 1) {
    return {
      candidate: null,
      reason: `${label} — présent dans ${hits.map((h) => h.sessionLabel).join(' / ')}, date piscine absente`,
    };
  }
  return { candidate: null, reason: `${label} — aucun candidat correspondant` };
}

// ─── Import ──────────────────────────────────────────────────────────────────

interface Stats {
  reviews: number;
  comments: number;
  skippedExisting: number;
}

async function importSource(source: SourceRef, index: CandidateIndex, stats: Stats) {
  const rows = await queryAll(source.dataSourceId);
  console.log(`\n━━ ${source.title} — ${rows.length} ligne(s)`);

  if (inspectOnly) {
    if (rows.length === 0) return;
    console.log('   Colonnes :');
    for (const [name, value] of Object.entries(rows[0].properties as AnyProp)) {
      console.log(`     - ${name}  [${(value as AnyProp).type}]`);
    }
    console.log('   2 premières lignes :');
    for (const row of rows.slice(0, 2)) {
      const p = row.properties as AnyProp;
      console.log(`     · ${text(p, 'login') || text(p, 'nom') || '(?)'}`);
      for (const c of PROJECT_COLUMNS) {
        const v = text(p, ...c.aliases);
        if (v) console.log(`        ${c.project}: ${v.slice(0, 90)}`);
      }
      const com = text(p, 'Commentaire (GO)', 'commentaire go', 'commentaire');
      if (com) console.log(`        commentaire: ${com.slice(0, 90)}`);
    }
    return;
  }

  const unresolved: string[] = [];

  for (const row of rows) {
    const props = row.properties as AnyProp;

    const { candidate, reason } = resolveCandidate(props, index);
    if (!candidate) {
      if (reason) unresolved.push(reason);
      continue;
    }

    // Comptes rendus de projet, emplacement 1 (Notion n'en porte qu'un).
    for (const col of PROJECT_COLUMNS) {
      const content = text(props, ...col.aliases);
      if (!content) continue;

      const [existing] = await db
        .select({ id: piscineProjectReviews.id })
        .from(piscineProjectReviews)
        .where(
          and(
            eq(piscineProjectReviews.candidateId, candidate.id),
            eq(piscineProjectReviews.project, col.project),
            eq(piscineProjectReviews.slot, 1),
          ),
        )
        .limit(1);

      if (existing) {
        // Une saisie faite dans le hub prime : l'import ne l'écrase pas.
        stats.skippedExisting++;
        continue;
      }

      stats.reviews++;
      console.log(
        `   + ${candidate.login.padEnd(12)} ${col.project.padEnd(12)} ${content.replace(/\s+/g, ' ').slice(0, 70)}`,
      );
      if (apply) {
        await db.insert(piscineProjectReviews).values({
          candidateId: candidate.id,
          project: col.project,
          slot: 1,
          content,
          author: 'Import Notion',
        });
      }
    }

    const comment = text(props, 'Commentaire (GO)', 'commentaire go', 'commentaire');
    if (comment) {
      const [existing] = await db
        .select({ candidateId: piscineCandidateComments.candidateId })
        .from(piscineCandidateComments)
        .where(eq(piscineCandidateComments.candidateId, candidate.id))
        .limit(1);

      if (existing) {
        stats.skippedExisting++;
      } else {
        stats.comments++;
        console.log(
          `   + ${candidate.login.padEnd(12)} ${'commentaire'.padEnd(12)} ${comment.replace(/\s+/g, ' ').slice(0, 70)}`,
        );
        if (apply) {
          await db.insert(piscineCandidateComments).values({
            candidateId: candidate.id,
            comment,
            author: 'Import Notion',
          });
        }
      }
    }
  }

  if (unresolved.length) {
    console.log(`   ⚠️  ${unresolved.length} ligne(s) non rapprochée(s) :`);
    [...new Set(unresolved)].slice(0, 12).forEach((u) => console.log(`      - ${u}`));
    if (unresolved.length > 12) console.log(`      … et ${unresolved.length - 12} autre(s)`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(
    inspectOnly
      ? 'ℹ️  MODE INSPECTION — lecture seule.'
      : apply
        ? '⚠️  MODE APPLY — les écritures en base sont réelles.'
        : 'ℹ️  DRY-RUN — aucune écriture. Ajouter --apply pour appliquer.',
  );
  console.log(`   Racine Notion : ${rootId}\n`);

  let sources: SourceRef[];
  try {
    sources = await discoverDataSources(rootId);
  } catch (e) {
    if (isNotionClientError(e) && (e as AnyProp).code === 'object_not_found') {
      console.error(
        "❌ Notion renvoie 404 : la page n'est pas partagée avec l'intégration.\n" +
          '   Notion → « Bilan de piscine » → ⋯ → Connexions → ajouter\n' +
          "   l'intégration de NOTION_TOKEN. Le partage se propage aux sous-pages.",
      );
      await pool.end();
      process.exit(1);
    }
    throw e;
  }

  if (sources.length === 0) {
    console.error(
      '❌ Aucune base exploitable trouvée.' +
        (linkedViews.length
          ? `\n   ${linkedViews.length} vue(s) liée(s) rencontrée(s) : ${linkedViews.join(', ')}` +
            "\n   Une vue liée n'expose pas ses données ; viser la base d'origine."
          : ''),
    );
    await pool.end();
    process.exit(1);
  }

  console.log(`${sources.length} base(s) détectée(s).`);
  const index = await loadCandidates();
  console.log(`${index.all} candidats en base pour le rapprochement.`);

  const stats: Stats = { reviews: 0, comments: 0, skippedExisting: 0 };
  for (const source of sources) await importSource(source, index, stats);

  if (!inspectOnly) {
    console.log('\n─── Récapitulatif');
    console.log(`   comptes rendus à importer : ${stats.reviews}`);
    console.log(`   commentaires à importer   : ${stats.comments}`);
    console.log(`   déjà saisis dans le hub   : ${stats.skippedExisting} (non écrasés)`);
  }

  await pool.end();
}

main().catch(async (e) => {
  console.error('❌ Import échoué :', e);
  await pool.end();
  process.exit(1);
});
