#!/usr/bin/env tsx
/**
 * Script de seed pour générer des audits de code-reviews
 * pour les promos 32, 148, 216 depuis l'API Zone01.
 *
 * Usage: npx tsx scripts/seed-audits.ts
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

// ─── Configuration ───────────────────────────────────────────────────────────

const PROMO_IDS = ['32', '148', '216'];

// Projets à auditer par track (au moins 2 par track)
const PROJECTS_PER_TRACK: Record<Track, string[]> = {
  Golang:     ['go-reloaded', 'ascii-art', 'groupie-tracker'],
  Javascript: ['make-your-game', 'real-time-forum', 'graphql'],
  Rust:       ['smart-road', 'filler', '0-shell'],
  Java:       ['lets-play', 'angul-it', 'buy-01'],
};

const AUDITORS = ['Makcime', 'Vivien', 'Cyril Ramananjaona'];

// ─── Templates de messages ────────────────────────────────────────────────────

// Résumés globaux d'audit (variés selon qualité : good / medium / poor)
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

// Feedbacks individuels par étudiant
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Graine déterministe par login pour que le même étudiant ait un profil cohérent
function studentSeed(login: string): number {
  let h = 0;
  for (const c of login) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

type Quality = 'good' | 'medium' | 'poor';

function studentQuality(login: string): Quality {
  const seed = studentSeed(login);
  const r = seed % 10;
  if (r < 5) return 'good';
  if (r < 8) return 'medium';
  return 'poor';
}

// Feedback varié par login + index d'audit pour éviter la répétition
function getFeedback(login: string, auditIndex: number): string {
  const quality = studentQuality(login);
  const pool = FEEDBACKS[quality];
  return pool[auditIndex % pool.length];
}

function getSummary(logins: string[]): string {
  // Qualité du groupe = moyenne pondérée
  const scores = logins.map((l) => ({ good: 2, medium: 1, poor: 0 } as Record<Quality, number>)[studentQuality(l)]);
  const avg = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
  const quality: Quality = avg >= 1.5 ? 'good' : avg >= 0.8 ? 'medium' : 'poor';
  const pool = SUMMARIES[quality];
  // Varier par hash du premier login
  const idx = studentSeed(logins[0] ?? 'x') % pool.length;
  return pool[idx];
}

// ─── Zone01 API ───────────────────────────────────────────────────────────────

interface Zone01Entry {
  user: { login: string };
  object: { name: string };
  group: { id: number; status: string; members?: { userLogin: string }[] };
  grade?: number | null;
}

async function fetchProgressions(promoId: string): Promise<Zone01Entry[]> {
  const url = `https://api-zone01-rouen.deno.dev/api/v1/promotions/${promoId}/students`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Zone01 API error for promo ${promoId}: ${res.status}`);
  const data = await res.json();
  return data.progress ?? [];
}

interface GroupData {
  groupId: string;
  projectName: string;
  members: string[];
}

function buildGroups(progressions: Zone01Entry[], projectNameLower: string): GroupData[] {
  const map = new Map<string, GroupData>();
  for (const entry of progressions) {
    if (entry.object.name.toLowerCase() !== projectNameLower) continue;
    if (entry.group.status !== 'finished') continue;
    const id = String(entry.group.id);
    if (!map.has(id)) {
      // Reconstituer les membres depuis group.members ou accumuler via user.login
      const members: string[] =
        entry.group.members?.map((m) => m.userLogin) ?? [];
      map.set(id, { groupId: id, projectName: entry.object.name, members });
    }
    // Si members était vide (API sans group.members), ajouter via user.login
    const g = map.get(id)!;
    if (g.members.length === 0) {
      g.members.push(entry.user.login);
    } else if (!g.members.includes(entry.user.login)) {
      g.members.push(entry.user.login);
    }
  }
  return Array.from(map.values());
}

// ─── DB ───────────────────────────────────────────────────────────────────────

async function auditExists(promoId: string, projectName: string, groupId: string): Promise<boolean> {
  const existing = await db
    .select({ id: audits.id })
    .from(audits)
    .where(
      and(
        eq(audits.promoId, promoId),
        eq(audits.projectName, projectName),
        eq(audits.groupId, groupId)
      )
    )
    .limit(1);
  return existing.length > 0;
}

// Normalise le nom du projet pour l'affichage (correspond au DB name)
const DB_PROJECT_NAMES: Record<string, string> = {
  'go-reloaded': 'Go-reloaded',
  'ascii-art': 'Ascii-art',
  'ascii-art-web': 'Ascii-art-web',
  'groupie-tracker': 'Groupie-tracker',
  'lem-in': 'Lem-in',
  'forum': 'Forum',
  'make-your-game': 'Make-your-game',
  'real-time-forum': 'Real-time-forum',
  'graphql': 'Graphql',
  'social-network': 'Social-network',
  'mini-framework': 'Mini-framework',
  'bomberman-dom': 'Bomberman-dom',
  'smart-road': 'Smart-road',
  'filler': 'Filler',
  'rt': 'RT',
  'multiplayer-fps': 'Multiplayer-fps',
  '0-shell': '0-shell',
  'lets-play': 'Lets-Play',
  'angul-it': 'Angul-It',
  'buy-01': 'Buy-01',
  'mr-jenk': 'MR-Jenk',
  'safe-zone': 'Safe-Zone',
};

// Track par projet
const PROJECT_TRACK: Record<string, Track> = {
  'Go-reloaded': 'Golang',
  'Ascii-art': 'Golang',
  'Ascii-art-web': 'Golang',
  'Groupie-tracker': 'Golang',
  'Lem-in': 'Golang',
  'Forum': 'Golang',
  'Make-your-game': 'Javascript',
  'Real-time-forum': 'Javascript',
  'Graphql': 'Javascript',
  'Social-network': 'Javascript',
  'Mini-framework': 'Javascript',
  'Bomberman-dom': 'Javascript',
  'Smart-road': 'Rust',
  'Filler': 'Rust',
  'RT': 'Rust',
  'Multiplayer-fps': 'Rust',
  '0-shell': 'Rust',
  'Lets-Play': 'Java',
  'Angul-It': 'Java',
  'Buy-01': 'Java',
  'MR-Jenk': 'Java',
  'Safe-Zone': 'Java',
};

// ─── Main ─────────────────────────────────────────────────────────────────────

// Compteur d'audits par login pour varier les feedbacks
const auditCountByLogin = new Map<string, number>();

async function seedPromo(promoId: string): Promise<void> {
  console.log(`\n--- Promo ${promoId} ---`);
  const progressions = await fetchProgressions(promoId);
  console.log(`  ${progressions.length} entrées fetchées depuis Zone01`);

  let inserted = 0;
  let skipped = 0;

  for (const [track, projectsLower] of Object.entries(PROJECTS_PER_TRACK) as [Track, string[]][]) {
    for (const projectLower of projectsLower) {
      const dbName = DB_PROJECT_NAMES[projectLower];
      if (!dbName) continue;

      const groups = buildGroups(progressions, projectLower);
      if (groups.length === 0) {
        console.log(`  [${track}] ${dbName}: aucun groupe finished trouvé`);
        continue;
      }

      for (const group of groups) {
        if (group.members.length === 0) continue;

        const exists = await auditExists(promoId, dbName, group.groupId);
        if (exists) {
          skipped++;
          continue;
        }

        const summary = getSummary(group.members);
        const auditorName = AUDITORS[studentSeed(group.groupId) % AUDITORS.length];

        // Résultats individuels
        const results = group.members.map((login) => {
          const idx = auditCountByLogin.get(login) ?? 0;
          auditCountByLogin.set(login, idx + 1);
          return {
            studentLogin: login,
            validated: true,
            absent: false,
            feedback: getFeedback(login, idx),
            warnings: [] as string[],
          };
        });

        const validatedCount = results.length;
        const totalMembers = results.length;
        const priority = 'normal';

        try {
          await db.transaction(async (tx) => {
            const [audit] = await tx
              .insert(audits)
              .values({
                promoId,
                track,
                projectName: dbName,
                groupId: group.groupId,
                summary,
                warnings: [],
                auditorName,
                priority,
                validatedCount,
                totalMembers,
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
                  warnings: [],
                }))
              );
            }
          });

          inserted++;
          console.log(
            `  [${track}] ${dbName} groupe ${group.groupId} (${group.members.join(', ')}) → ${auditorName}`
          );
        } catch (err: any) {
          if (err?.code === '23505') {
            skipped++;
          } else {
            console.error(`  ERREUR groupe ${group.groupId}:`, err.message);
          }
        }
      }
    }
  }

  console.log(`  -> ${inserted} audits insérés, ${skipped} déjà existants`);
}

async function main() {
  console.log('Seed audits — promos 32, 148, 216\n');
  try {
    for (const promoId of PROMO_IDS) {
      await seedPromo(promoId);
    }
    console.log('\nTerminé.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
