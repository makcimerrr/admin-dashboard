#!/usr/bin/env tsx
/**
 * Migration Notion → HUB (module « Suivi en entreprise »).
 *
 * Reprend les deux tables du Notion :
 *   1. la fiche apprenant/stagiaire (entreprise, tuteur, dates, type de contrat)
 *   2. l'historique des comptes rendus de suivi déjà réalisés
 *
 * Usage :
 *   pnpm tsx scripts/import-followups-csv.ts --people people.csv
 *   pnpm tsx scripts/import-followups-csv.ts --people people.csv --reports cr.csv --apply
 *
 * SANS `--apply`, le script ne fait qu'un DRY-RUN : il affiche le rapprochement
 * ligne par ligne et n'écrit RIEN. Vérifier ce rapport avant d'appliquer.
 *
 * ── Colonnes attendues (l'en-tête est normalisé : minuscules, sans accents) ──
 *
 * people.csv :
 *   nom, prenom            (obligatoires si `login` absent)
 *   login                  (login Zone01 — le rapprochement le plus fiable)
 *   promo                  (informatif ; la promo du hub fait foi)
 *   entreprise             raison sociale
 *   adresse                adresse de l'entreprise (optionnel)
 *   siret                  (optionnel)
 *   tuteur                 nom du tuteur
 *   tuteur_email           ⚠️ ABSENT d'émargement : c'est la valeur ajoutée du Notion
 *   tuteur_tel
 *   date_debut, date_fin   JJ/MM/AAAA ou AAAA-MM-JJ
 *   type                   alternance | apprentissage | professionnalisation | stage
 *
 * reports.csv :
 *   nom, prenom | login    l'apprenant concerné
 *   date                   date de réalisation du suivi
 *   auteur
 *   contenu                le compte rendu
 *   vigilance              points de vigilance (optionnel)
 *
 * ── Règle de non-duplication ────────────────────────────────────────────────
 * Un apprenant qui a DÉJÀ un contrat synchronisé depuis émargement ne reçoit
 * pas un second contrat : la ligne Notion vient ENRICHIR le contrat existant
 * (email du tuteur, entreprise, adresse). C'est le comportement voulu —
 * émargement reste la source de vérité pour les dates, le Notion apporte les
 * coordonnées qu'émargement ne porte pas.
 */

import { readFileSync } from 'node:fs';
import { config } from 'dotenv';
import { parse } from 'csv-parse/sync';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { and, eq } from 'drizzle-orm';
import { students } from '../lib/db/schema/students';
import { alternantContracts } from '../lib/db/schema/alternants';
import { followUpReports } from '../lib/db/schema/followUps';

config();

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
const db = drizzle(pool);

// ─── CLI ─────────────────────────────────────────────────────────────────────

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const peopleFile = arg('people');
const reportsFile = arg('reports');
const apply = process.argv.includes('--apply');

if (!peopleFile && !reportsFile) {
  console.error('Usage : --people <fichier.csv> [--reports <fichier.csv>] [--apply]');
  process.exit(1);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function norm(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Accepte JJ/MM/AAAA, AAAA-MM-JJ et JJ-MM-AAAA. Renvoie null si illisible. */
function parseDate(raw: string | undefined): Date | null {
  const value = raw?.trim();
  if (!value) return null;

  const fr = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (fr) {
    return new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1]));
  }
  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }
  return null;
}

/** Le Notion parle « alternance / stage » ; la base parle types de contrat. */
function mapContractType(raw: string | undefined): string {
  const v = norm(raw);
  if (v.includes('apprentissage')) return 'apprentissage';
  if (v.includes('profession')) return 'professionnalisation';
  if (v.includes('stage')) return 'stage';
  if (v.includes('alternance')) return 'apprentissage';
  return 'autre';
}

type Row = Record<string, string>;

function readCsv(file: string): Row[] {
  const raw = readFileSync(file, 'utf8');
  const rows = parse(raw, {
    columns: (header: string[]) => header.map((h) => norm(h).replace(/\s+/g, '_')),
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as Row[];
  return rows;
}

/** Première colonne renseignée parmi les alias donnés. */
function pick(row: Row, ...keys: string[]): string | undefined {
  for (const k of keys) {
    if (row[k]?.trim()) return row[k].trim();
  }
  return undefined;
}

// ─── Rapprochement apprenants ────────────────────────────────────────────────

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

function resolveStudent(
  row: Row,
  index: { byLogin: Map<string, HubStudent>; byName: Map<string, HubStudent> },
): HubStudent | null {
  const login = pick(row, 'login', 'identifiant');
  if (login) {
    const hit = index.byLogin.get(norm(login));
    if (hit) return hit;
  }
  const first = pick(row, 'prenom', 'first_name');
  const last = pick(row, 'nom', 'last_name', 'nom_de_famille');
  const full = pick(row, 'apprenant', 'nom_complet', 'stagiaire', 'alternant');

  for (const candidate of [full, first && last ? `${first} ${last}` : undefined]) {
    if (!candidate) continue;
    const hit = index.byName.get(norm(candidate));
    if (hit) return hit;
  }
  return null;
}

// ─── Import des fiches ───────────────────────────────────────────────────────

async function importPeople(file: string, index: Awaited<ReturnType<typeof loadStudents>>) {
  const rows = readCsv(file);
  console.log(`\n📄 ${file} — ${rows.length} ligne(s)\n`);

  let created = 0;
  let enriched = 0;
  const unresolved: string[] = [];
  const invalidDates: string[] = [];

  for (const row of rows) {
    const student = resolveStudent(row, index);
    const label =
      pick(row, 'apprenant', 'nom_complet') ??
      `${pick(row, 'prenom') ?? ''} ${pick(row, 'nom') ?? ''}`.trim() ??
      '(sans nom)';

    if (!student) {
      unresolved.push(label);
      continue;
    }

    const startDate = parseDate(pick(row, 'date_debut', 'debut', 'date_de_debut'));
    const endDate = parseDate(pick(row, 'date_fin', 'fin', 'date_de_fin'));
    if (!startDate || !endDate) {
      invalidDates.push(`${label} (${pick(row, 'date_debut') ?? '?'} → ${pick(row, 'date_fin') ?? '?'})`);
      continue;
    }

    const company = pick(row, 'entreprise', 'societe', 'raison_sociale') ?? 'Non renseigné';
    const tutorName = pick(row, 'tuteur', 'tuteur_nom', 'nom_tuteur') ?? null;
    const tutorEmail = pick(row, 'tuteur_email', 'email_tuteur', 'mail_tuteur') ?? null;
    const tutorPhone = pick(row, 'tuteur_tel', 'telephone_tuteur', 'tel_tuteur') ?? null;
    const address = pick(row, 'adresse', 'adresse_entreprise') ?? null;
    const siret = pick(row, 'siret') ?? null;
    const contractType = mapContractType(pick(row, 'type', 'type_contrat', 'contrat'));

    // Contrat déjà synchronisé depuis émargement ? → on ENRICHIT, on ne duplique pas.
    const [existing] = await db
      .select({ id: alternantContracts.id, tutorEmail: alternantContracts.tutorEmail })
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
        `  ↻ ${student.login.padEnd(12)} contrat émargement #${existing.id} enrichi` +
          `${tutorEmail ? ` · email tuteur : ${tutorEmail}` : ' · (pas d’email tuteur dans le CSV)'}`,
      );
      if (apply) {
        await db
          .update(alternantContracts)
          .set({
            ...(tutorEmail ? { tutorEmail } : {}),
            ...(address ? { companyAddress: address } : {}),
            ...(siret ? { companySiret: siret } : {}),
            companyName: company,
            updatedAt: new Date(),
          })
          .where(eq(alternantContracts.id, existing.id));

        // `students.company_name` est la saisie durable réappliquée par la
        // synchro : sans ça, l'entreprise repasserait à « Non renseigné ».
        await db
          .update(students)
          .set({ companyName: company, companyEmail: tutorEmail, companyContact: tutorName })
          .where(eq(students.id, student.id));
      }
      continue;
    }

    created++;
    console.log(
      `  + ${student.login.padEnd(12)} ${contractType.padEnd(22)} ${company} ` +
        `(${startDate.toLocaleDateString('fr-FR')} → ${endDate.toLocaleDateString('fr-FR')})`,
    );

    if (apply) {
      await db.insert(alternantContracts).values({
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
      });
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

  console.log(
    `\n  → ${created} contrat(s) à créer, ${enriched} contrat(s) émargement à enrichir`,
  );
  if (unresolved.length) {
    console.log(`  ⚠️  ${unresolved.length} apprenant(s) non rapproché(s) :`);
    unresolved.forEach((u) => console.log(`      - ${u}`));
  }
  if (invalidDates.length) {
    console.log(`  ⚠️  ${invalidDates.length} ligne(s) avec des dates illisibles :`);
    invalidDates.forEach((u) => console.log(`      - ${u}`));
  }
}

// ─── Import des comptes rendus ───────────────────────────────────────────────

async function importReports(file: string, index: Awaited<ReturnType<typeof loadStudents>>) {
  const rows = readCsv(file);
  console.log(`\n📄 ${file} — ${rows.length} compte(s) rendu(s)\n`);

  let imported = 0;
  const unresolved: string[] = [];

  for (const row of rows) {
    const student = resolveStudent(row, index);
    const content = pick(row, 'contenu', 'compte_rendu', 'cr', 'commentaire', 'notes');
    const label = pick(row, 'apprenant', 'nom_complet', 'nom') ?? '(sans nom)';

    if (!student) {
      unresolved.push(label);
      continue;
    }
    if (!content) {
      console.log(`  ⏭  ${label} — compte rendu vide, ignoré`);
      continue;
    }

    const performedAt = parseDate(pick(row, 'date', 'date_suivi', 'date_realisation')) ?? new Date();
    const author = pick(row, 'auteur', 'realise_par') ?? 'Import Notion';

    imported++;
    console.log(
      `  + ${student.login.padEnd(12)} ${performedAt.toLocaleDateString('fr-FR')} — ${content.slice(0, 60)}…`,
    );

    if (apply) {
      // Pas de `milestoneId` : ces suivis sont antérieurs au module. Ils
      // alimentent l'historique de l'apprenant sans clore d'échéance calculée.
      await db.insert(followUpReports).values({
        studentId: student.id,
        performedAt,
        author,
        content,
        vigilancePoints: pick(row, 'vigilance', 'points_de_vigilance') ?? null,
        companyName: pick(row, 'entreprise', 'societe') ?? null,
        tutorName: pick(row, 'tuteur') ?? null,
      });
    }
  }

  console.log(`\n  → ${imported} compte(s) rendu(s) à importer`);
  if (unresolved.length) {
    console.log(`  ⚠️  ${unresolved.length} ligne(s) non rapprochée(s) :`);
    unresolved.forEach((u) => console.log(`      - ${u}`));
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(
    apply
      ? '⚠️  MODE APPLY — les écritures sont réelles.'
      : 'ℹ️  DRY-RUN — aucune écriture. Ajouter --apply pour appliquer.',
  );

  const index = await loadStudents();

  if (peopleFile) await importPeople(peopleFile, index);
  if (reportsFile) await importReports(reportsFile, index);

  if (apply) {
    console.log(
      "\n✅ Import terminé. Lancez ensuite « Recalculer les échéances » depuis " +
        '/alternants (onglet Suivi en entreprise) pour poser les jalons.',
    );
  }

  await pool.end();
}

main().catch(async (e) => {
  console.error('❌ Import échoué :', e);
  await pool.end();
  process.exit(1);
});
