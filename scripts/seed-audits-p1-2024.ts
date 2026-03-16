#!/usr/bin/env tsx
/**
 * Seed audits pour P1 2024 (eventId: 303)
 * Dates d'audit calculées depuis la timeline réelle de la promo.
 *
 * Usage: npx tsx scripts/seed-audits-p1-2024.ts
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, and } from 'drizzle-orm';
import { audits, auditResults } from '../lib/db/schema/audits';
import type { Track } from '../lib/db/schema/audits';

config();

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
const db = drizzle(pool);

const PROMO_ID = '303';
const AUDITORS = ['Makcime', 'Vivien', 'Cyril Ramananjaona'];

// ─── Timeline P1 2024 ────────────────────────────────────────────────────────
// Basée sur : start=2024-06-03, piscineJsEnd=2025-01-26, piscineRustEnd=2025-09-12
// Dates d'audit = ~5-10 jours après la fin théorique du projet

interface ProjectInfo {
  dbName: string;
  track: Track;
  auditDate: Date; // date de réalisation de l'audit
}

const PROJECTS: ProjectInfo[] = [
  // ── Golang ── (start: 2024-06-03)
  { dbName: 'Go-reloaded',     track: 'Golang',     auditDate: new Date('2024-06-17') },
  { dbName: 'Ascii-art',       track: 'Golang',     auditDate: new Date('2024-07-08') },
  { dbName: 'Ascii-art-web',   track: 'Golang',     auditDate: new Date('2024-07-29') },
  { dbName: 'Groupie-tracker', track: 'Golang',     auditDate: new Date('2024-09-10') },
  { dbName: 'Lem-in',          track: 'Golang',     auditDate: new Date('2024-10-08') },
  { dbName: 'Forum',           track: 'Golang',     auditDate: new Date('2024-12-16') },

  // ── Javascript ── (start: 2025-01-27, après piscine JS)
  { dbName: 'Make-your-game',  track: 'Javascript', auditDate: new Date('2025-03-24') },
  { dbName: 'Real-time-forum', track: 'Javascript', auditDate: new Date('2025-04-28') },
  { dbName: 'Graphql',         track: 'Javascript', auditDate: new Date('2025-05-06') },
  { dbName: 'Social-network',  track: 'Javascript', auditDate: new Date('2025-07-07') },
  { dbName: 'Mini-framework',  track: 'Javascript', auditDate: new Date('2025-07-21') },
  { dbName: 'Bomberman-dom',   track: 'Javascript', auditDate: new Date('2025-09-02') },

  // ── Rust ── (start: 2025-09-13, après piscine Rust)
  { dbName: 'Smart-road',      track: 'Rust',       auditDate: new Date('2025-09-24') },
  { dbName: 'Filler',          track: 'Rust',       auditDate: new Date('2025-10-15') },
  { dbName: 'RT',              track: 'Rust',       auditDate: new Date('2025-11-26') },
  { dbName: 'Multiplayer-fps', track: 'Rust',       auditDate: new Date('2026-01-08') },
  { dbName: '0-shell',         track: 'Rust',       auditDate: new Date('2026-02-04') },

  // ── Java ── (start: 2025-09-13, après piscine Rust)
  { dbName: 'Lets-Play',       track: 'Java',       auditDate: new Date('2025-09-24') },
  { dbName: 'Angul-It',        track: 'Java',       auditDate: new Date('2025-10-15') },
  { dbName: 'Buy-01',          track: 'Java',       auditDate: new Date('2025-11-26') },
  { dbName: 'MR-Jenk',         track: 'Java',       auditDate: new Date('2026-01-08') },
  { dbName: 'Safe-Zone',       track: 'Java',       auditDate: new Date('2026-02-04') },
];

// ─── Templates ───────────────────────────────────────────────────────────────

const SUMMARIES = {
  good: [
    `✅ **Points forts :**\n\n- README complet et clair, facilitant la compréhension du projet.\n- Gestion Git correcte : commits utiles et lisibles, branches bien nommées.\n- Code bien structuré, lisible et commenté.\n- Bonne compréhension globale du projet et des concepts utilisés.\n\n⚠️ **Points à améliorer :**\n\n- Aucun point bloquant à remonter.\n\n👉 **Conclusion générale :**\n\nProjet bien maîtrisé. Le code est propre, clair et les pratiques de versionning sont respectées.`,
    `### Débrief de Code Review\n\nLe projet est **bien compris** dans son ensemble. Le code est **fonctionnel**, **propre** et respecte la logique attendue. Les choix techniques sont cohérents et les **explications fournies sont claires et pertinentes**, ce qui facilite la lecture du travail réalisé.\n\n👏 **Très bon travail**, avec une légère marge de progression sur l'architecture du code.`,
    `✅ **Points forts :**\n\n- Projet fonctionnel, tous les cas testés passent.\n- Code bien organisé et lisible sans effort.\n- Bonne maîtrise du langage et des structures de données utilisées.\n- Explications fluides et pertinentes lors de la review.\n\n⚠️ **Points à améliorer :**\n\n- Quelques commentaires manquants sur les fonctions complexes.\n\n👉 **Conclusion :**\n\nTravail de qualité, étudiant en bonne progression.`,
  ],
  medium: [
    `- Code fonctionnel et propre.\n- Difficultés à expliquer certaines parties du code, notamment des notions techniques utilisées, avec un manque de recul sur un projet réalisé il y a quelque temps.\n- Connaissance des termes techniques encore partielle, ce qui limite la capacité à expliquer et défendre les choix faits.\n- Rappel nécessaire sur le nommage des commits et des branches.\n\n👉 **Projet globalement solide sur le plan technique, mais des progrès sont attendus sur la maîtrise des concepts utilisés et la capacité à expliquer clairement son code.**`,
    `✅ **Points positifs :**\n- Projet fonctionnel\n- Explications correctes dans l'ensemble\n- Projet passe les audits\n\n⚠️ **À améliorer :**\n- Gestion des erreurs perfectible\n- Certaines fonctions pourraient être mieux découpées\n- Commentaires insuffisants sur les parties complexes\n\n👉 **Travail correct, mais des axes d'amélioration sont identifiés.**`,
    `Points positifs:\n✅ Explication claire du projet\n✅ Projet passe les audits\n✅ Code commenté\n\nÀ améliorer:\n⚠️ Manque de rigueur sur les cas limites\n⚠️ La gestion des erreurs pourrait être plus robuste\n\n👉 **Niveau correct, travail à poursuivre.**`,
  ],
  poor: [
    `- Code très propre, bien structuré et fonctionnel.\n- Projet réalisé quasi intégralement via l'IA, sans réelle appropriation.\n- Compréhension partielle de ce qui était attendu fonctionnellement.\n- Incapacité à expliquer le code, les mécanismes de base ou même la manière de lancer le programme, malgré un accompagnement.\n\n👉 **Rendu techniquement propre en apparence, mais projet non maîtrisé. De gros axes d'amélioration sont attendus sur l'appropriation du code, les bases et la compréhension globale du projet.**`,
    `- Code non maîtrisé : incapable d'expliquer le code présenté, sans appropriation ni relecture suffisante.\n- Compréhension du projet moyenne : l'objectif global est partiellement compris, mais les explications restent approximatives.\n- Bases encore fragiles : difficultés sur des notions fondamentales.\n- Étudiant conscient de ses difficultés et engagé dans une démarche de progression.\n\n👉 **Projet peu maîtrisé à ce stade. Des progrès sont attendus sur les bases du langage, l'appropriation du code présenté et la capacité à expliquer les concepts utilisés.**`,
    `Points positifs:\n✅ Projet rendu et fonctionnel\n\nPoints négatifs:\n⚠️ Explications assez vagues sur les choix d'implémentation\n⚠️ Difficultés sur les notions de base du langage\n⚠️ Manque de rigueur dans les commits\n\n👉 **Travail insuffisant en l'état. Un effort important est attendu sur la compréhension du code produit.**`,
  ],
};

const FEEDBACKS = {
  good: [
    `## Évaluation technique\n\n- Code bien maîtrisé\n- Bonne compréhension globale de l'architecture du projet\n- Contribution technique solide et régulière\n\n## Collaboration & implication\n\n- Bonne implication dans le groupe\n- Communication claire avec les coéquipiers\n- Prend des initiatives utiles`,
    `## Évaluation technique\n\n- Maîtrise correcte du code produit\n- Capable d'expliquer chaque partie du projet\n- Bonne connaissance des outils utilisés\n\n## Collaboration & implication\n\n- Participation active au développement\n- Bonne répartition du travail avec l'équipe`,
    `## Évaluation technique\n\n- Très bonne compréhension des fonctionnalités du projet\n- Participation efficace au développement global\n- Connaissance solide des concepts utilisés\n\n## Collaboration & implication\n\n- Très bonne dynamique de groupe\n- Leadership positif dans l'équipe`,
  ],
  medium: [
    `## Évaluation technique\n\n- Compréhension partielle du code produit\n- Bases suffisantes pour avancer, mais à consolider\n- Quelques lacunes sur les notions avancées\n\n## Collaboration & implication\n\n- Participation correcte\n- À améliorer : prise d'initiative et implication dans les décisions techniques`,
    `## Évaluation technique\n\n- Code globalement compris, mais difficultés sur certains points précis\n- Explications parfois hésitantes\n\n## Collaboration & implication\n\n- Présence correcte dans le groupe\n- Communication à améliorer`,
    `## Évaluation technique\n\n- Niveau technique correct, connaissance des bases\n- Manque de profondeur sur certains concepts\n\n## Collaboration & implication\n\n- S'implique dans le projet sans être moteur\n- Doit gagner en autonomie`,
  ],
  poor: [
    `## Évaluation technique\n\n- Difficultés importantes à expliquer le code produit\n- Notions fondamentales insuffisamment maîtrisées\n- Projet visiblement peu relu après livraison\n\n## Collaboration & implication\n\n- Manque de préparation à la review\n- Doit retravailler les bases du langage`,
    `## Évaluation technique\n\n- Compréhension très partielle du projet\n- Ne peut pas justifier les choix d'implémentation\n\n## Collaboration & implication\n\n- Participation insuffisante au sein du groupe\n- Travail à rattraper avant la prochaine review`,
    `## Évaluation technique\n\n- Code non maîtrisé, difficultés à expliquer même les parties simples\n- Bases du langage à revoir\n\n## Collaboration & implication\n\n- Peu d'implication visible dans le groupe\n- Encourage à consulter les ressources disponibles`,
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function studentSeed(login: string): number {
  let h = 0;
  for (const c of login) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

type Quality = 'good' | 'medium' | 'poor';

function studentQuality(login: string): Quality {
  const r = studentSeed(login) % 10;
  if (r < 5) return 'good';
  if (r < 8) return 'medium';
  return 'poor';
}

function getFeedback(login: string, idx: number): string {
  const pool = FEEDBACKS[studentQuality(login)];
  return pool[idx % pool.length];
}

function getSummary(logins: string[]): string {
  const scores = logins.map((l) => ({ good: 2, medium: 1, poor: 0 } as Record<Quality, number>)[studentQuality(l)]);
  const avg = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
  const quality: Quality = avg >= 1.5 ? 'good' : avg >= 0.8 ? 'medium' : 'poor';
  const pool = SUMMARIES[quality];
  return pool[studentSeed(logins[0] ?? 'x') % pool.length];
}

// ─── Zone01 API ───────────────────────────────────────────────────────────────

interface Zone01Entry {
  user: { login: string };
  object: { name: string };
  group: { id: number; status: string; members?: { userLogin: string }[] };
}

async function fetchProgressions(promoId: string): Promise<Zone01Entry[]> {
  const url = `https://api-zone01-rouen.deno.dev/api/v1/promotions/${promoId}/students`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Zone01 API error: ${res.status}`);
  const data = await res.json();
  return data.progress ?? [];
}

interface GroupData {
  groupId: string;
  projectName: string;
  members: string[];
}

function buildGroups(progressions: Zone01Entry[], dbProjectName: string): GroupData[] {
  const nameLower = dbProjectName.toLowerCase();
  const map = new Map<string, GroupData>();
  for (const entry of progressions) {
    if (entry.object.name.toLowerCase() !== nameLower) continue;
    if (entry.group.status !== 'finished') continue;
    const id = String(entry.group.id);
    if (!map.has(id)) {
      const members = entry.group.members?.map((m) => m.userLogin) ?? [];
      map.set(id, { groupId: id, projectName: entry.object.name, members });
    }
    const g = map.get(id)!;
    if (!g.members.includes(entry.user.login)) g.members.push(entry.user.login);
  }
  return Array.from(map.values());
}

// ─── DB ───────────────────────────────────────────────────────────────────────

async function auditExists(promoId: string, projectName: string, groupId: string): Promise<boolean> {
  const rows = await db
    .select({ id: audits.id })
    .from(audits)
    .where(and(eq(audits.promoId, promoId), eq(audits.projectName, projectName), eq(audits.groupId, groupId)))
    .limit(1);
  return rows.length > 0;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const auditCountByLogin = new Map<string, number>();

async function main() {
  console.log(`\nSeed audits — P1 2024 (promo ${PROMO_ID})\n`);

  const progressions = await fetchProgressions(PROMO_ID);
  console.log(`${progressions.length} entrées fetchées depuis Zone01\n`);

  let inserted = 0;
  let skipped = 0;
  let noGroups = 0;

  for (const project of PROJECTS) {
    const groups = buildGroups(progressions, project.dbName);

    if (groups.length === 0) {
      console.log(`  [${project.track}] ${project.dbName}: aucun groupe finished`);
      noGroups++;
      continue;
    }

    for (const group of groups) {
      if (group.members.length === 0) continue;

      const exists = await auditExists(PROMO_ID, project.dbName, group.groupId);
      if (exists) { skipped++; continue; }

      const summary    = getSummary(group.members);
      const auditorName = AUDITORS[studentSeed(group.groupId) % AUDITORS.length];

      const results = group.members.map((login) => {
        const idx = auditCountByLogin.get(login) ?? 0;
        auditCountByLogin.set(login, idx + 1);
        const quality = studentQuality(login);
        return {
          studentLogin: login,
          validated: true,
          absent: false,
          feedback: getFeedback(login, idx),
          warnings: quality === 'poor'
            ? ['Maîtrise du code insuffisante, revoir les bases du langage']
            : [],
        };
      });

      const validatedCount = results.filter((r) => r.validated).length;

      try {
        await db.transaction(async (tx) => {
          const [audit] = await tx
            .insert(audits)
            .values({
              promoId: PROMO_ID,
              track: project.track,
              projectName: project.dbName,
              groupId: group.groupId,
              summary,
              warnings: [],
              auditorName,
              priority: 'normal',
              validatedCount,
              totalMembers: results.length,
              createdAt: project.auditDate,
              updatedAt: project.auditDate,
            })
            .returning();

          if (results.length > 0) {
            await tx.insert(auditResults).values(
              results.map((r) => ({
                auditId: audit.id,
                studentLogin: r.studentLogin,
                validated: r.validated,
                absent: r.absent,
                feedback: r.feedback,
                warnings: r.warnings,
              }))
            );
          }
        });

        inserted++;
        const date = project.auditDate.toISOString().split('T')[0];
        console.log(`  ✓ [${project.track}] ${project.dbName} groupe ${group.groupId} (${group.members.length} membres) — ${auditorName} — ${date}`);
      } catch (err: any) {
        if (err?.code === '23505') skipped++;
        else console.error(`  ✗ groupe ${group.groupId}:`, err.message);
      }
    }
  }

  console.log(`\n─────────────────────────────────`);
  console.log(`Insérés : ${inserted}`);
  console.log(`Déjà existants : ${skipped}`);
  console.log(`Projets sans groupe finished : ${noGroups}`);
  console.log(`Logins uniques couverts : ${auditCountByLogin.size}`);

  // Stats par login
  const counts = [...auditCountByLogin.values()];
  if (counts.length > 0) {
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    const avg = (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1);
    console.log(`Audits par étudiant : min=${min}, max=${max}, moy=${avg}`);
  }

  await pool.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
