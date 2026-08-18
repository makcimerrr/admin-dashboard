#!/usr/bin/env tsx
/**
 * Migration Notion → HUB (module « Suivi en entreprise »), 100 % via l'API.
 *
 * Source : la page Notion « Suivi entretiens Tuteurs » (ou toute base passée en
 * argument). Le script lit les bases via l'API Notion — pas d'export CSV — donc
 * il est REJOUABLE : on peut le relancer tant que le Notion continue de vivre
 * en parallèle, sans créer de doublon.
 *
 * Usage :
 *   pnpm tsx scripts/import-notion-followups.ts --inspect          # schéma + 3 lignes
 *   pnpm tsx scripts/import-notion-followups.ts                    # dry-run complet
 *   pnpm tsx scripts/import-notion-followups.ts --apply            # écrit en base
 *   pnpm tsx scripts/import-notion-followups.ts --page <id>        # autre page/base
 *
 * Prérequis : la page doit être partagée avec l'intégration Notion
 * (Notion → page → ⋯ → Connexions → ajouter l'intégration de `NOTION_TOKEN`).
 * Sans ce partage l'API répond 404, même avec un token valide.
 *
 * ── Ce qui est écrit ────────────────────────────────────────────────────────
 *  - contrats (`alternant_contracts`, source='notion') pour les apprenants qui
 *    n'en ont pas déjà un synchronisé depuis émargement ;
 *  - enrichissement des contrats émargement existants (email du tuteur —
 *    qu'émargement ne porte pas —, entreprise, adresse) sans les dupliquer ;
 *  - comptes rendus de suivi déjà réalisés (`follow_up_reports`), dédoublonnés.
 *
 * Rien n'est supprimé, jamais. Les lignes non rapprochées sont listées.
 */

import { config } from 'dotenv';
import { Client, isNotionClientError } from '@notionhq/client';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { and, eq, sql } from 'drizzle-orm';
import { students } from '../lib/db/schema/students';
import { alternantContracts } from '../lib/db/schema/alternants';
import { followUpReports } from '../lib/db/schema/followUps';

config();

/** Page « Suivi entretiens Tuteurs » (zone01rouen) par défaut. */
const DEFAULT_PAGE_ID = '641862b579db47c199b6ec7e9e522d22';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const apply = process.argv.includes('--apply');
const inspectOnly = process.argv.includes('--inspect');
const targetId = arg('page') ?? process.env.NOTION_FOLLOWUP_PAGE_ID ?? DEFAULT_PAGE_ID;

if (!process.env.NOTION_TOKEN) {
  console.error('❌ NOTION_TOKEN absent de l’environnement.');
  process.exit(1);
}

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
const db = drizzle(pool);

// ─── Helpers texte / dates ───────────────────────────────────────────────────

function norm(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

type AnyProp = Record<string, any>;

/**
 * Rend une propriété Notion en texte, quel que soit son type. Notion mélange
 * volontiers title / rich_text / select / formula / rollup pour une même
 * colonne selon la façon dont elle a été créée.
 */
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
    case 'created_by':
      return prop.created_by?.name ?? '';
    case 'formula':
      return plain({ type: prop.formula?.type, [prop.formula?.type]: prop.formula?.[prop.formula?.type] });
    case 'rollup':
      if (prop.rollup?.type === 'array') {
        return (prop.rollup.array ?? []).map((p: AnyProp) => plain(p)).filter(Boolean).join(', ');
      }
      return plain({ type: prop.rollup?.type, [prop.rollup?.type]: prop.rollup?.[prop.rollup?.type] });
    default:
      return '';
  }
}

/** Date d'une propriété Notion (ISO), ou parse d'un texte JJ/MM/AAAA. */
function propDate(prop: AnyProp | undefined): Date | null {
  const raw = plain(prop);
  if (!raw) return null;
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const fr = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (fr) return new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1]));
  return null;
}

/**
 * Retrouve une propriété par son nom, en tolérant accents, casse et
 * ponctuation (« Date de début », « date_debut », « DÉBUT » → même clé).
 */
function findProp(props: AnyProp, ...aliases: string[]): AnyProp | undefined {
  const index = new Map<string, AnyProp>();
  for (const [key, value] of Object.entries(props)) index.set(norm(key), value);

  for (const alias of aliases) {
    const hit = index.get(norm(alias));
    if (hit) return hit;
  }
  // Repli : correspondance partielle (« Tuteur (email) » pour l'alias « tuteur email »).
  for (const alias of aliases) {
    const needle = norm(alias);
    for (const [key, value] of index) {
      if (key.includes(needle)) return value;
    }
  }
  return undefined;
}

function text(props: AnyProp, ...aliases: string[]): string {
  return plain(findProp(props, ...aliases));
}

function mapContractType(raw: string): string {
  const v = norm(raw);
  if (v.includes('apprentissage')) return 'apprentissage';
  if (v.includes('profession')) return 'professionnalisation';
  if (v.includes('stage')) return 'stage';
  if (v.includes('alternance') || v.includes('alternant')) return 'apprentissage';
  return 'autre';
}

// ─── Découverte des bases dans la page ───────────────────────────────────────

interface DataSourceRef {
  databaseId: string;
  dataSourceId: string;
  title: string;
}

/**
 * Bases rencontrées SANS data source exploitable : ce sont des « vues liées »
 * (linked views). Notion les expose comme `child_database`, mais les données
 * vivent dans une base ailleurs, et l'API n'offre aucun moyen de remonter de la
 * vue à sa source. Il faut cibler la base d'origine directement.
 */
const linkedViews: { blockId: string; title: string }[] = [];

/** Bases (data sources) exploitables sous l'objet ciblé. */
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
    if (depth > 3) return; // garde-fou : on ne descend pas indéfiniment
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

async function queryAll(dataSourceId: string): Promise<AnyProp[]> {
  const rows: AnyProp[] = [];
  let cursor: string | undefined;
  do {
    const res = (await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      page_size: 100,
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

/** Rapproche une ligne Notion d'un apprenant : login d'abord, nom ensuite. */
function resolveStudent(props: AnyProp, index: StudentIndex): HubStudent | null {
  const login = text(props, 'login', 'identifiant', 'pseudo');
  if (login) {
    const hit = index.byLogin.get(norm(login));
    if (hit) return hit;
  }

  const candidates = [
    text(props, 'apprenant', 'nom complet', 'stagiaire', 'alternant', 'etudiant', 'nom'),
    [text(props, 'prenom'), text(props, 'nom')].filter(Boolean).join(' '),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const hit = index.byName.get(norm(candidate));
    if (hit) return hit;
  }
  return null;
}

/** Libellé humain d'une ligne, pour les rapports d'anomalie. */
function rowLabel(props: AnyProp): string {
  return (
    text(props, 'apprenant', 'nom complet', 'stagiaire', 'alternant', 'etudiant', 'nom') ||
    [text(props, 'prenom'), text(props, 'nom')].filter(Boolean).join(' ') ||
    '(sans nom)'
  );
}

// ─── Inspection (mode --inspect) ─────────────────────────────────────────────

function inspectRows(title: string, rows: AnyProp[]) {
  console.log(`\n━━ ${title} — ${rows.length} ligne(s)`);
  if (rows.length === 0) return;

  const props = rows[0].properties as AnyProp;
  console.log('\n  Colonnes :');
  for (const [name, value] of Object.entries(props)) {
    console.log(`    - ${name}  [${(value as AnyProp).type}]`);
  }

  console.log('\n  3 premières lignes :');
  for (const row of rows.slice(0, 3)) {
    console.log('    ·');
    for (const [name, value] of Object.entries(row.properties as AnyProp)) {
      const v = plain(value as AnyProp);
      if (v) console.log(`      ${name}: ${v.slice(0, 100)}`);
    }
  }
}

// ─── Import des fiches (contrat / entreprise / tuteur) ───────────────────────

async function importContracts(rows: AnyProp[], index: StudentIndex) {
  let created = 0;
  let enriched = 0;
  const unresolved: string[] = [];
  const noDates: string[] = [];

  for (const row of rows) {
    const props = row.properties as AnyProp;
    const label = rowLabel(props);
    const student = resolveStudent(props, index);
    if (!student) {
      unresolved.push(label);
      continue;
    }

    const startDate = propDate(findProp(props, 'date debut', 'debut', 'date de debut', 'demarrage'));
    const endDate = propDate(findProp(props, 'date fin', 'fin', 'date de fin'));

    const company = text(props, 'entreprise', 'societe', 'raison sociale') || 'Non renseigné';
    const tutorName = text(props, 'tuteur', 'nom tuteur', 'tuteur nom', 'referent') || null;
    const tutorEmail = text(props, 'tuteur email', 'email tuteur', 'mail tuteur', 'email') || null;
    const tutorPhone =
      text(props, 'tuteur tel', 'telephone tuteur', 'tel tuteur', 'telephone') || null;
    const address = text(props, 'adresse', 'adresse entreprise') || null;
    const siret = text(props, 'siret') || null;
    const contractType = mapContractType(text(props, 'type', 'type contrat', 'contrat', 'statut'));

    // Contrat déjà synchronisé depuis émargement ? → enrichir, ne pas dupliquer.
    const [existing] = await db
      .select({ id: alternantContracts.id })
      .from(alternantContracts)
      .where(
        and(
          eq(alternantContracts.studentId, student.id),
          eq(alternantContracts.source, 'emargement'),
        ),
      )
      .limit(1);

    if (existing) {
      enriched++;
      console.log(
        `  ↻ ${student.login.padEnd(14)} contrat émargement #${existing.id}` +
          `${tutorEmail ? ` · email tuteur : ${tutorEmail}` : ' · pas d’email tuteur dans Notion'}`,
      );
      if (apply) {
        await db
          .update(alternantContracts)
          .set({
            ...(tutorEmail ? { tutorEmail } : {}),
            ...(tutorName ? { tutorName } : {}),
            ...(address ? { companyAddress: address } : {}),
            ...(siret ? { companySiret: siret } : {}),
            ...(company !== 'Non renseigné' ? { companyName: company } : {}),
            updatedAt: new Date(),
          })
          .where(eq(alternantContracts.id, existing.id));

        // `students.company_name` est la saisie durable réappliquée par la
        // synchro émargement : sans ça l'entreprise repasserait à « Non renseigné ».
        await db
          .update(students)
          .set({
            ...(company !== 'Non renseigné' ? { companyName: company } : {}),
            companyContact: tutorName,
            companyEmail: tutorEmail,
            ...(tutorPhone ? { companyPhone: tutorPhone } : {}),
          })
          .where(eq(students.id, student.id));
      }
      continue;
    }

    if (!startDate || !endDate) {
      noDates.push(label);
      continue;
    }

    // Déjà importé lors d'un passage précédent ? (script rejouable)
    const [alreadyImported] = await db
      .select({ id: alternantContracts.id })
      .from(alternantContracts)
      .where(
        and(
          eq(alternantContracts.studentId, student.id),
          eq(alternantContracts.source, 'notion'),
        ),
      )
      .limit(1);

    created++;
    console.log(
      `  ${alreadyImported ? '↻' : '+'} ${student.login.padEnd(14)} ${contractType.padEnd(22)} ` +
        `${company} (${startDate.toLocaleDateString('fr-FR')} → ${endDate.toLocaleDateString('fr-FR')})`,
    );

    if (apply) {
      const values = {
        studentId: student.id,
        contractType,
        startDate,
        endDate,
        companyName: company,
        companyAddress: address,
        companySiret: siret,
        tutorName,
        tutorEmail,
        tutorPhone,
        isActive: endDate >= new Date(),
        source: 'notion',
        updatedAt: new Date(),
      };
      if (alreadyImported) {
        await db
          .update(alternantContracts)
          .set(values)
          .where(eq(alternantContracts.id, alreadyImported.id));
      } else {
        await db.insert(alternantContracts).values(values);
      }
      await db
        .update(students)
        .set({
          companyName: company,
          companyContact: tutorName,
          companyEmail: tutorEmail,
          companyPhone: tutorPhone,
        })
        .where(eq(students.id, student.id));
    }
  }

  console.log(`\n  → ${created} contrat(s) Notion, ${enriched} contrat(s) émargement enrichi(s)`);
  if (unresolved.length) {
    console.log(`  ⚠️  ${unresolved.length} ligne(s) non rapprochée(s) à un apprenant du hub :`);
    [...new Set(unresolved)].forEach((u) => console.log(`      - ${u}`));
  }
  if (noDates.length) {
    console.log(`  ⚠️  ${noDates.length} ligne(s) sans dates de contrat exploitables :`);
    [...new Set(noDates)].forEach((u) => console.log(`      - ${u}`));
  }
}

// ─── Import des comptes rendus ───────────────────────────────────────────────

/** Contenu du corps de la page Notion (le CR est souvent écrit dedans). */
async function pageBodyText(pageId: string): Promise<string> {
  const parts: string[] = [];
  let cursor: string | undefined;
  do {
    const res = (await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100,
    })) as AnyProp;
    for (const block of res.results as AnyProp[]) {
      const content = block[block.type];
      const rich = content?.rich_text;
      if (Array.isArray(rich)) {
        const line = rich.map((t: AnyProp) => t.plain_text ?? '').join('').trim();
        if (line) parts.push(line);
      }
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return parts.join('\n');
}

async function importReports(rows: AnyProp[], index: StudentIndex) {
  let imported = 0;
  let skippedExisting = 0;
  const unresolved: string[] = [];
  const empty: string[] = [];

  for (const row of rows) {
    const props = row.properties as AnyProp;
    const label = rowLabel(props);
    const student = resolveStudent(props, index);
    if (!student) {
      unresolved.push(label);
      continue;
    }

    // Le compte rendu vit soit dans une propriété, soit dans le corps de la page.
    let content =
      text(props, 'compte rendu', 'cr', 'contenu', 'commentaire', 'notes', 'bilan', 'echange');
    if (!content) content = await pageBodyText(row.id);
    if (!content.trim()) {
      empty.push(label);
      continue;
    }

    const performedAt =
      propDate(findProp(props, 'date entretien', 'date suivi', 'date', 'date realisation')) ??
      new Date(row.created_time);
    const author =
      text(props, 'auteur', 'realise par', 'intervenant', 'responsable') || 'Import Notion';

    // Dédoublonnage : même apprenant, même jour → déjà importé.
    const [existing] = await db
      .select({ id: followUpReports.id })
      .from(followUpReports)
      .where(
        and(
          eq(followUpReports.studentId, student.id),
          sql`date_trunc('day', ${followUpReports.performedAt}) = date_trunc('day', ${performedAt}::timestamp)`,
        ),
      )
      .limit(1);

    if (existing) {
      skippedExisting++;
      continue;
    }

    imported++;
    console.log(
      `  + ${student.login.padEnd(14)} ${performedAt.toLocaleDateString('fr-FR')} — ${content
        .replace(/\s+/g, ' ')
        .slice(0, 70)}…`,
    );

    if (apply) {
      // Pas de `milestoneId` : ces suivis sont antérieurs au module, ils
      // alimentent l'historique sans clore d'échéance calculée.
      await db.insert(followUpReports).values({
        studentId: student.id,
        performedAt,
        author,
        content,
        vigilancePoints: text(props, 'vigilance', 'points de vigilance', 'alerte') || null,
        companyName: text(props, 'entreprise', 'societe') || null,
        tutorName: text(props, 'tuteur', 'referent') || null,
      });
    }
  }

  console.log(
    `\n  → ${imported} compte(s) rendu(s) à importer, ${skippedExisting} déjà présent(s)`,
  );
  if (unresolved.length) {
    console.log(`  ⚠️  ${unresolved.length} ligne(s) non rapprochée(s) :`);
    [...new Set(unresolved)].forEach((u) => console.log(`      - ${u}`));
  }
  if (empty.length) {
    console.log(`  ℹ️  ${empty.length} ligne(s) sans contenu de compte rendu (ignorées)`);
  }
}

// ─── Choix de la nature d'une base ───────────────────────────────────────────

/**
 * Une base « comptes rendus » porte une colonne de contenu et/ou une date
 * d'entretien ; une base « fiches » porte des dates de contrat. Le doute
 * profite aux fiches (on n'invente pas d'historique).
 */
function looksLikeReports(rows: AnyProp[]): boolean {
  if (rows.length === 0) return false;
  const props = rows[0].properties as AnyProp;
  const hasContent = Boolean(
    findProp(props, 'compte rendu', 'cr', 'contenu', 'commentaire', 'bilan', 'echange'),
  );
  const hasEntretienDate = Boolean(findProp(props, 'date entretien', 'date suivi'));
  const hasContractDates = Boolean(findProp(props, 'date debut', 'date fin'));
  return (hasContent || hasEntretienDate) && !hasContractDates;
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
  console.log(`   Cible Notion : ${targetId}\n`);

  let sources: DataSourceRef[];
  try {
    sources = await discoverDataSources(targetId);
  } catch (e) {
    if (isNotionClientError(e) && (e as AnyProp).code === 'object_not_found') {
      console.error(
        '❌ Notion renvoie 404. La page n’est pas partagée avec l’intégration.\n' +
          '   Dans Notion : ouvrir la page → ⋯ (en haut à droite) → Connexions →\n' +
          '   ajouter l’intégration associée à NOTION_TOKEN, puis relancer.',
      );
      await pool.end();
      process.exit(1);
    }
    throw e;
  }

  if (sources.length === 0) {
    if (linkedViews.length > 0) {
      console.error(
        '❌ Cette page ne contient que des VUES LIÉES, pas la base elle-même :\n' +
          linkedViews.map((v) => `     · ${v.title} (bloc ${v.blockId})`).join('\n') +
          '\n\n   Une vue liée n’expose aucune donnée par l’API, et rien ne permet de\n' +
          '   remonter à sa base d’origine. Il faut viser la base source :\n' +
          '     1. dans Notion, cliquer sur le titre de la vue → « Ouvrir la source »\n' +
          '        (ou ⋯ au-dessus de la vue → la base d’origine) ;\n' +
          '     2. sur cette base, ⋯ → Connexions → ajouter « Zone01 Rouen Data » ;\n' +
          '     3. copier son lien et relancer avec --page <id de la base>.',
      );
    } else {
      console.error('❌ Aucune base trouvée sous cet objet Notion.');
    }
    await pool.end();
    process.exit(1);
  }

  console.log(`${sources.length} base(s) détectée(s) :`);
  sources.forEach((s) => console.log(`  - ${s.title} (${s.dataSourceId})`));

  const index = await loadStudents();

  for (const source of sources) {
    const rows = await queryAll(source.dataSourceId);

    if (inspectOnly) {
      inspectRows(source.title, rows);
      continue;
    }

    const kind = looksLikeReports(rows) ? 'comptes rendus' : 'fiches apprenant';
    console.log(`\n━━ ${source.title} — ${rows.length} ligne(s) — traitée comme « ${kind} »\n`);

    if (kind === 'comptes rendus') await importReports(rows, index);
    else await importContracts(rows, index);
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
