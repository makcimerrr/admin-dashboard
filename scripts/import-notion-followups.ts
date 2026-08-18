#!/usr/bin/env tsx
/**
 * Migration Notion → HUB (module « Suivi en entreprise »), 100 % via l'API.
 *
 * Source : base « Données Utilisateurs (Auto) » du workspace zone01rouen
 * (~5 400 lignes, 274 colonnes — un enregistrement par candidat/apprenant).
 * La page « Suivi entretiens Tuteurs » n'en est qu'une VUE LIÉE : les vues
 * n'exposent aucune donnée par l'API, il faut viser la base elle-même.
 *
 * Une ligne porte à la fois la fiche contrat ET l'historique d'entretiens :
 *
 *   Login · Nom · Prénom · Promo          → rapprochement avec l'apprenant du hub
 *   Entreprises                           → entreprise
 *   Tuteur 1 / Mail Tuteur / Tél Tuteur 1 → le tuteur (⚠️ l'email n'existe QUE ici,
 *                                            émargement ne le porte pas)
 *   Adresse / Code Postal / Ville Tuteur  → adresse entreprise
 *   Type de contrat                       → apprentissage / pro / stage
 *   Date Début Alt / Date fin Alt         → contrat d'alternance
 *   Date Début Stag / Date fin Stag       → contrat de stage
 *   Rappel suivi entreprise               → la date de relance tenue à la main
 *                                            (conservée dans les notes du contrat)
 *   Suivi entretiens Alternance           → compte rendu des entretiens passés
 *
 * Usage :
 *   pnpm tsx scripts/import-notion-followups.ts --inspect   # schéma + 3 lignes
 *   pnpm tsx scripts/import-notion-followups.ts             # dry-run complet
 *   pnpm tsx scripts/import-notion-followups.ts --apply     # écrit en base
 *   pnpm tsx scripts/import-notion-followups.ts --page <id> # autre base
 *
 * Prérequis : la base doit être partagée avec l'intégration de `NOTION_TOKEN`
 * (Notion → base → ⋯ → Connexions). Sans ce partage, l'API répond 404.
 *
 * Rien n'est jamais supprimé, et le script est REJOUABLE : contrats mis à jour
 * en place, comptes rendus déjà présents ignorés.
 */

import { config } from 'dotenv';
import { Client, isNotionClientError } from '@notionhq/client';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { and, eq, sql } from 'drizzle-orm';
import { students } from '../lib/db/schema/students';
import { alternantContracts } from '../lib/db/schema/alternants';
import { followUpReports } from '../lib/db/schema/followUps';
import { dateInText, splitLogEntries } from '../lib/services/follow-up-import';

config();

/** Base « Données Utilisateurs (Auto) » (zone01rouen). */
const DEFAULT_DATABASE_ID = 'efb33fd9ecb74a8d9c0778ef48421d54';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const apply = process.argv.includes('--apply');
const inspectOnly = process.argv.includes('--inspect');
const targetId = arg('page') ?? process.env.NOTION_FOLLOWUP_PAGE_ID ?? DEFAULT_DATABASE_ID;

if (!process.env.NOTION_TOKEN) {
  console.error('❌ NOTION_TOKEN absent de l’environnement.');
  process.exit(1);
}

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
const db = drizzle(pool);

type AnyProp = Record<string, any>;

// ─── Helpers texte / dates ───────────────────────────────────────────────────

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
      return (prop.people ?? []).map((p: AnyProp) => p.name ?? p.person?.email ?? '').join(', ');
    case 'email':
      return prop.email ?? '';
    case 'phone_number':
      return prop.phone_number ?? '';
    case 'url':
      return prop.url ?? '';
    case 'number':
      return prop.number != null ? String(prop.number) : '';
    case 'checkbox':
      return prop.checkbox ? 'oui' : '';
    case 'date':
      return prop.date?.start ?? '';
    case 'created_time':
      return prop.created_time ?? '';
    case 'last_edited_time':
      return prop.last_edited_time ?? '';
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

/** Date ISO (propriété `date`) ou texte JJ/MM/AAAA. */
function toDate(raw: string): Date | null {
  if (!raw) return null;
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const fr = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (fr) return new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1]));
  return null;
}

/** Premier email valide d'un champ libre (souvent mal saisi : espaces, virgules). */
function firstEmail(raw: string): string | null {
  const m = raw.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return m ? m[0].toLowerCase() : null;
}

/**
 * Retrouve une propriété par son nom, en tolérant accents, casse et
 * ponctuation. Correspondance EXACTE d'abord (« Nom » ne doit pas attraper
 * « Nom responsable »), correspondance partielle seulement en dernier recours.
 */
function findProp(props: AnyProp, ...aliases: string[]): AnyProp | undefined {
  const index = new Map<string, AnyProp>();
  for (const [key, value] of Object.entries(props)) index.set(norm(key), value);

  for (const alias of aliases) {
    const hit = index.get(norm(alias));
    if (hit) return hit;
  }
  for (const alias of aliases) {
    const needle = norm(alias);
    for (const [key, value] of index) {
      if (key.includes(needle)) return value;
    }
  }
  return undefined;
}

function text(props: AnyProp, ...aliases: string[]): string {
  const value = plain(findProp(props, ...aliases)).trim();
  // « Untitled » est un reliquat de Notion (relation vide rendue en texte),
  // pas un vrai nom d'entreprise.
  return norm(value) === 'untitled' ? '' : value;
}

function mapContractType(raw: string, fallback: string): string {
  const v = norm(raw);
  if (v.includes('apprentissage')) return 'apprentissage';
  if (v.includes('profession')) return 'professionnalisation';
  if (v.includes('stage')) return 'stage';
  if (v.includes('alternance') || v.includes('alternant')) return 'apprentissage';
  return fallback;
}

// ─── Découverte de la base ───────────────────────────────────────────────────

interface DataSourceRef {
  databaseId: string;
  dataSourceId: string;
  title: string;
}

/**
 * Bases sans data source : ce sont des VUES LIÉES. Notion les expose comme
 * `child_database`, mais les données vivent ailleurs et l'API n'offre aucun
 * moyen de remonter de la vue à sa source.
 */
const linkedViews: { blockId: string; title: string }[] = [];

async function discoverDataSources(id: string): Promise<DataSourceRef[]> {
  const found: DataSourceRef[] = [];

  const addDatabase = async (databaseId: string, fallbackTitle = '') => {
    const database = (await notion.databases.retrieve({ database_id: databaseId })) as AnyProp;
    const title =
      (database.title ?? []).map((t: AnyProp) => t.plain_text).join('') || fallbackTitle;
    const sources = database.data_sources ?? [];
    if (sources.length === 0) {
      linkedViews.push({ blockId: databaseId, title: title || fallbackTitle || 'Sans titre' });
      return;
    }
    for (const ds of sources) {
      found.push({ databaseId, dataSourceId: ds.id, title: ds.name || title });
    }
  };

  // 1. L'ID cible est-il déjà une base ?
  try {
    await addDatabase(id);
    if (found.length) return found;
  } catch (e) {
    if (!isNotionClientError(e)) throw e;
    // Sinon c'est une page : on descend dans ses blocs.
  }

  // 2. Page → bases enfants (y compris les bases « inline »).
  const walk = async (blockId: string, depth: number): Promise<void> => {
    if (depth > 3) return;
    let cursor: string | undefined;
    do {
      const res = (await notion.blocks.children.list({
        block_id: blockId,
        start_cursor: cursor,
        page_size: 100,
      })) as AnyProp;
      for (const block of res.results as AnyProp[]) {
        if (block.type === 'child_database') {
          await addDatabase(block.id, block.child_database?.title ?? '');
        } else if (block.has_children) {
          await walk(block.id, depth + 1);
        }
      }
      cursor = res.has_more ? res.next_cursor : undefined;
    } while (cursor);
  };

  await walk(id, 0);
  return found;
}

/**
 * Ne rapatrie que les lignes susceptibles de nous intéresser. Sur une base de
 * 5 400 candidats, filtrer côté Notion évite ~50 requêtes inutiles.
 */
function buildFilter(schema: AnyProp): AnyProp | undefined {
  const has = (name: string) => Object.keys(schema).some((k) => norm(k) === norm(name));
  const or: AnyProp[] = [];
  if (has('Date Début Alt')) or.push({ property: 'Date Début Alt', date: { is_not_empty: true } });
  if (has('Date Début Stag')) or.push({ property: 'Date Début Stag', date: { is_not_empty: true } });
  if (has('Mail Tuteur')) or.push({ property: 'Mail Tuteur', rich_text: { is_not_empty: true } });
  if (has('Suivi entretiens Alternance')) {
    or.push({ property: 'Suivi entretiens Alternance', rich_text: { is_not_empty: true } });
  }
  return or.length ? { or } : undefined;
}

async function queryAll(dataSourceId: string, filter?: AnyProp): Promise<AnyProp[]> {
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

// ─── Rapprochement avec les apprenants du hub ────────────────────────────────

interface HubStudent {
  id: number;
  login: string;
  firstName: string;
  lastName: string;
}

async function loadStudents() {
  const rows = (await db
    .select({
      id: students.id,
      login: students.login,
      firstName: students.first_name,
      lastName: students.last_name,
    })
    .from(students)) as HubStudent[];

  const byLogin = new Map<string, HubStudent>();
  const byName = new Map<string, HubStudent>();
  for (const s of rows) {
    byLogin.set(norm(s.login), s);
    byName.set(norm(`${s.firstName} ${s.lastName}`), s);
    byName.set(norm(`${s.lastName} ${s.firstName}`), s);
  }
  return { byLogin, byName };
}

type StudentIndex = Awaited<ReturnType<typeof loadStudents>>;

function resolveStudent(props: AnyProp, index: StudentIndex): HubStudent | null {
  const login = text(props, 'login', 'identifiant', 'pseudo');
  if (login) {
    const hit = index.byLogin.get(norm(login));
    if (hit) return hit;
  }
  const first = text(props, 'prenom');
  const last = text(props, 'nom');
  if (first && last) {
    const hit = index.byName.get(norm(`${first} ${last}`));
    if (hit) return hit;
  }
  return null;
}

function rowLabel(props: AnyProp): string {
  const login = text(props, 'login');
  const name = [text(props, 'prenom'), text(props, 'nom')].filter(Boolean).join(' ');
  return [login, name].filter(Boolean).join(' — ') || '(sans identité)';
}

// ─── Extraction d'une ligne ──────────────────────────────────────────────────

interface Extracted {
  company: string;
  contractType: string;
  startDate: Date | null;
  endDate: Date | null;
  tutorName: string | null;
  tutorEmail: string | null;
  tutorPhone: string | null;
  address: string | null;
  /** Date de relance tenue à la main dans Notion — on ne la perd pas. */
  notionReminder: Date | null;
  /** Historique d'entretiens saisi en texte libre. */
  followUpLog: string;
}

function extract(props: AnyProp): Extracted {
  const altStart = toDate(text(props, 'Date Début Alt'));
  const altEnd = toDate(text(props, 'Date fin Alt'));
  const stageStart = toDate(text(props, 'Date Début Stag'));
  const stageEnd = toDate(text(props, 'Date fin Stag'));

  // L'alternance prime : le stage n'est repris que s'il n'y a pas d'alternance.
  const isStage = !altStart && !!stageStart;
  const startDate = altStart ?? stageStart;
  const endDate = altEnd ?? stageEnd;

  const address = [
    text(props, 'Adresse Tuteur'),
    [text(props, 'Code Postal Tuteur'), text(props, 'Ville Tuteur')].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(', ');

  return {
    company: text(props, 'entreprises', 'entreprise', 'societe') || 'Non renseigné',
    contractType: mapContractType(
      text(props, 'Type de contrat'),
      isStage ? 'stage' : 'apprentissage',
    ),
    startDate,
    endDate,
    tutorName: text(props, 'Tuteur 1') || text(props, 'Tuteur 2') || null,
    tutorEmail: firstEmail(text(props, 'Mail Tuteur', 'email tuteur', 'tuteur email')),
    tutorPhone:
      text(props, 'Téléphone Tuteur 1') || text(props, 'Téléphone Tuteur 2') || null,
    address: address || null,
    notionReminder: toDate(text(props, 'Rappel suivi entreprise')),
    // Les deux journaux coexistent (alternance et stage) : on ne perd ni l'un
    // ni l'autre.
    followUpLog: [text(props, 'Suivi entretiens Alternance'), text(props, 'Commentaire Stage')]
      .filter(Boolean)
      .join('\n'),
  };
}

// ─── Inspection (mode --inspect) ─────────────────────────────────────────────

function inspectRows(title: string, rows: AnyProp[]) {
  console.log(`\n━━ ${title} — ${rows.length} ligne(s) retenue(s)`);
  if (rows.length === 0) return;

  console.log('\n  Lecture des 3 premières lignes telle que le script la fera :');
  for (const row of rows.slice(0, 3)) {
    const props = row.properties as AnyProp;
    const e = extract(props);
    console.log(`\n   · ${rowLabel(props)}`);
    console.log(`     entreprise    : ${e.company}`);
    console.log(`     type          : ${e.contractType}`);
    console.log(
      `     période       : ${e.startDate?.toLocaleDateString('fr-FR') ?? '?'} → ${
        e.endDate?.toLocaleDateString('fr-FR') ?? '?'
      }`,
    );
    console.log(`     tuteur        : ${e.tutorName ?? '—'} / ${e.tutorEmail ?? 'PAS D’EMAIL'}`);
    console.log(`     tél / adresse : ${e.tutorPhone ?? '—'} / ${e.address ?? '—'}`);
    console.log(
      `     rappel Notion : ${e.notionReminder?.toLocaleDateString('fr-FR') ?? '—'}`,
    );
    if (e.followUpLog) console.log(`     suivi         : ${e.followUpLog.slice(0, 120)}`);
  }
}

// ─── Import ──────────────────────────────────────────────────────────────────

interface Stats {
  contractsCreated: number;
  contractsUpdated: number;
  emargementEnriched: number;
  tutorEmails: number;
  reportsImported: number;
  reportsExisting: number;
}

async function importRows(rows: AnyProp[], index: StudentIndex) {
  const stats: Stats = {
    contractsCreated: 0,
    contractsUpdated: 0,
    emargementEnriched: 0,
    tutorEmails: 0,
    reportsImported: 0,
    reportsExisting: 0,
  };
  const unresolved: string[] = [];
  const noDates: string[] = [];

  for (const row of rows) {
    const props = row.properties as AnyProp;
    const student = resolveStudent(props, index);
    if (!student) {
      unresolved.push(rowLabel(props));
      continue;
    }

    const e = extract(props);
    const notes = e.notionReminder
      ? `Rappel suivi entreprise (repris de Notion) : ${e.notionReminder.toLocaleDateString('fr-FR')}`
      : null;

    // ── 1. Contrat ──────────────────────────────────────────────────────────
    const [emargementContract] = await db
      .select({ id: alternantContracts.id })
      .from(alternantContracts)
      .where(
        and(
          eq(alternantContracts.studentId, student.id),
          eq(alternantContracts.source, 'emargement'),
        ),
      )
      .limit(1);

    if (emargementContract) {
      // émargement fait foi sur les dates ; Notion apporte ce qu'il ne porte pas.
      stats.emargementEnriched++;
      if (e.tutorEmail) stats.tutorEmails++;
      console.log(
        `  ↻ ${student.login.padEnd(14)} contrat émargement #${emargementContract.id}` +
          ` · ${e.company}` +
          (e.tutorEmail ? ` · ✉ ${e.tutorEmail}` : ' · ⚠ pas d’email tuteur'),
      );
      if (apply) {
        await db
          .update(alternantContracts)
          .set({
            ...(e.tutorEmail ? { tutorEmail: e.tutorEmail } : {}),
            ...(e.tutorName ? { tutorName: e.tutorName } : {}),
            ...(e.tutorPhone ? { tutorPhone: e.tutorPhone } : {}),
            ...(e.address ? { companyAddress: e.address } : {}),
            ...(e.company !== 'Non renseigné' ? { companyName: e.company } : {}),
            ...(notes ? { notes } : {}),
            updatedAt: new Date(),
          })
          .where(eq(alternantContracts.id, emargementContract.id));

        // `students.company_name` est la saisie durable que la synchro
        // émargement réapplique : sans elle, l'entreprise repasserait à
        // « Non renseigné » à la prochaine synchro.
        await db
          .update(students)
          .set({
            ...(e.company !== 'Non renseigné' ? { companyName: e.company } : {}),
            companyContact: e.tutorName,
            companyEmail: e.tutorEmail,
            ...(e.tutorPhone ? { companyPhone: e.tutorPhone } : {}),
          })
          .where(eq(students.id, student.id));
      }
    } else if (e.startDate && e.endDate) {
      const [existing] = await db
        .select({ id: alternantContracts.id })
        .from(alternantContracts)
        .where(
          and(
            eq(alternantContracts.studentId, student.id),
            eq(alternantContracts.source, 'notion'),
          ),
        )
        .limit(1);

      if (existing) stats.contractsUpdated++;
      else stats.contractsCreated++;
      if (e.tutorEmail) stats.tutorEmails++;

      console.log(
        `  ${existing ? '↻' : '+'} ${student.login.padEnd(14)} ${e.contractType.padEnd(20)} ` +
          `${e.company} (${e.startDate.toLocaleDateString('fr-FR')} → ${e.endDate.toLocaleDateString('fr-FR')})` +
          (e.tutorEmail ? ` · ✉ ${e.tutorEmail}` : ''),
      );

      if (apply) {
        const values = {
          studentId: student.id,
          contractType: e.contractType,
          startDate: e.startDate,
          endDate: e.endDate,
          companyName: e.company,
          companyAddress: e.address,
          tutorName: e.tutorName,
          tutorEmail: e.tutorEmail,
          tutorPhone: e.tutorPhone,
          notes,
          isActive: e.endDate >= new Date(),
          source: 'notion',
          updatedAt: new Date(),
        };
        if (existing) {
          await db
            .update(alternantContracts)
            .set(values)
            .where(eq(alternantContracts.id, existing.id));
        } else {
          await db.insert(alternantContracts).values(values);
        }
        await db
          .update(students)
          .set({
            companyName: e.company,
            companyContact: e.tutorName,
            companyEmail: e.tutorEmail,
            companyPhone: e.tutorPhone,
          })
          .where(eq(students.id, student.id));
      }
    } else if (e.tutorEmail || e.followUpLog) {
      // Pas de dates exploitables : on ne fabrique pas un contrat, mais on le dit.
      noDates.push(`${rowLabel(props)} — ${e.company}`);
    }

    // ── 2. Comptes rendus d'entretien ───────────────────────────────────────
    for (const entry of splitLogEntries(e.followUpLog)) {
      const performedAt = entry.date ?? toDate(row.last_edited_time) ?? new Date();

      const [existingReport] = await db
        .select({ id: followUpReports.id })
        .from(followUpReports)
        .where(
          and(
            eq(followUpReports.studentId, student.id),
            sql`date_trunc('day', ${followUpReports.performedAt}) = date_trunc('day', ${performedAt}::timestamp)`,
          ),
        )
        .limit(1);

      if (existingReport) {
        stats.reportsExisting++;
        continue;
      }

      stats.reportsImported++;
      console.log(
        `      ↳ CR ${performedAt.toLocaleDateString('fr-FR')} : ${entry.content
          .replace(/\s+/g, ' ')
          .slice(0, 80)}`,
      );
      if (apply) {
        // Pas de `milestoneId` : ces suivis précèdent le module, ils
        // alimentent l'historique sans clore d'échéance calculée.
        await db.insert(followUpReports).values({
          studentId: student.id,
          performedAt,
          author: 'Import Notion',
          content: entry.content,
          companyName: e.company !== 'Non renseigné' ? e.company : null,
          tutorName: e.tutorName,
        });
      }
    }
  }

  console.log('\n─── Récapitulatif');
  console.log(`   contrats créés depuis Notion      : ${stats.contractsCreated}`);
  console.log(`   contrats Notion mis à jour        : ${stats.contractsUpdated}`);
  console.log(`   contrats émargement enrichis      : ${stats.emargementEnriched}`);
  console.log(`   emails de tuteur récupérés        : ${stats.tutorEmails}`);
  console.log(`   comptes rendus importés           : ${stats.reportsImported}`);
  console.log(`   comptes rendus déjà présents      : ${stats.reportsExisting}`);

  if (noDates.length) {
    console.log(
      `\n   ⚠️  ${noDates.length} ligne(s) avec un tuteur ou un suivi mais SANS dates de contrat :`,
    );
    noDates.slice(0, 20).forEach((u) => console.log(`      - ${u}`));
    if (noDates.length > 20) console.log(`      … et ${noDates.length - 20} autre(s)`);
  }
  if (unresolved.length) {
    console.log(
      `\n   ℹ️  ${unresolved.length} ligne(s) Notion sans apprenant correspondant dans le hub` +
        ' (anciennes promos, candidats non inscrits…) — ignorées :',
    );
    unresolved.slice(0, 15).forEach((u) => console.log(`      - ${u}`));
    if (unresolved.length > 15) console.log(`      … et ${unresolved.length - 15} autre(s)`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(
    inspectOnly
      ? 'ℹ️  MODE INSPECTION — lecture seule, rien n’est écrit.'
      : apply
        ? '⚠️  MODE APPLY — les écritures en base sont réelles.'
        : 'ℹ️  DRY-RUN — aucune écriture. Ajouter --apply pour appliquer.',
  );
  console.log(`   Source Notion : ${targetId}\n`);

  let sources: DataSourceRef[];
  try {
    sources = await discoverDataSources(targetId);
  } catch (e) {
    if (isNotionClientError(e) && (e as AnyProp).code === 'object_not_found') {
      console.error(
        '❌ Notion renvoie 404 : l’objet n’est pas partagé avec l’intégration.\n' +
          '   Notion → la base → ⋯ → Connexions → ajouter l’intégration de NOTION_TOKEN.',
      );
      await pool.end();
      process.exit(1);
    }
    throw e;
  }

  if (sources.length === 0) {
    if (linkedViews.length > 0) {
      console.error(
        '❌ Cet objet ne contient que des VUES LIÉES, pas la base elle-même :\n' +
          linkedViews.map((v) => `     · ${v.title} (bloc ${v.blockId})`).join('\n') +
          '\n\n   Une vue liée n’expose aucune donnée par l’API, et rien ne permet de\n' +
          '   remonter à sa base d’origine. Viser la base source :\n' +
          '     1. dans Notion, ouvrir la source de la vue ;\n' +
          '     2. sur cette base, ⋯ → Connexions → ajouter l’intégration ;\n' +
          '     3. relancer avec --page <id de la base>.',
      );
    } else {
      console.error('❌ Aucune base trouvée sous cet objet Notion.');
    }
    await pool.end();
    process.exit(1);
  }

  const index = await loadStudents();

  for (const source of sources) {
    const schema = ((await notion.dataSources.retrieve({
      data_source_id: source.dataSourceId,
    })) as AnyProp).properties as AnyProp;

    const filter = buildFilter(schema);
    const rows = await queryAll(source.dataSourceId, filter);

    console.log(
      `━━ ${source.title} — ${rows.length} ligne(s)` +
        (filter ? ' (filtrées : contrat, tuteur ou suivi renseigné)' : ''),
    );

    if (inspectOnly) {
      inspectRows(source.title, rows);
      continue;
    }
    console.log('');
    await importRows(rows, index);
  }

  if (apply) {
    console.log(
      '\n✅ Import terminé. Lancez « Recalculer les échéances » sur /alternants ' +
        '(onglet Suivi en entreprise) pour poser les jalons.',
    );
  }

  await pool.end();
}

main().catch(async (e) => {
  console.error('❌ Import échoué :', e);
  await pool.end();
  process.exit(1);
});
