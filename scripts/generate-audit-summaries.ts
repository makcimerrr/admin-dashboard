#!/usr/bin/env tsx
/**
 * Génère les résumés et feedbacks manquants pour les audits
 * à partir des données existantes (projet, validations, warnings).
 * Aucun appel à une API externe.
 *
 * Usage: npx tsx scripts/generate-audit-summaries.ts
 */

import { config } from 'dotenv';
config();

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, isNull, or, sql, inArray } from 'drizzle-orm';
import { audits, auditResults } from '../lib/db/schema/audits';

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
const db = drizzle(pool);

// ─── Contexte par projet ──────────────────────────────────────────────────────

const PROJECT_CONTEXT: Record<string, { skill: string; focus: string; techPoints: string[] }> = {
  'Go-reloaded': {
    skill: 'manipulation de chaînes de caractères en Go',
    focus: 'expressions régulières et traitement de texte',
    techPoints: ['Maîtrise des regex et du package strings', 'Gestion des cas limites', 'Lecture et écriture de fichiers'],
  },
  'Ascii-art': {
    skill: 'algorithmique et manipulation de chaînes',
    focus: 'conversion et affichage ASCII',
    techPoints: ['Compréhension de l\'algorithme de rendu', 'Gestion des polices ASCII', 'Traitement des caractères spéciaux'],
  },
  'Ascii-art-web': {
    skill: 'développement web Go (HTTP)',
    focus: 'serveur HTTP et rendu de templates',
    techPoints: ['Maîtrise du package net/http', 'Gestion des templates Go', 'Traitement des requêtes HTTP'],
  },
  'Groupie-tracker': {
    skill: 'consommation d\'API REST en Go',
    focus: 'architecture client HTTP et affichage de données',
    techPoints: ['Appels à des API externes', 'Décodage JSON', 'Organisation du code en packages'],
  },
  'Lem-in': {
    skill: 'algorithmique de graphes',
    focus: 'recherche de chemins et optimisation',
    techPoints: ['Algorithme BFS/DFS', 'Gestion de graphes', 'Optimisation des flux'],
  },
  'Forum': {
    skill: 'développement full-stack web',
    focus: 'authentification, base de données et sessions',
    techPoints: ['Gestion des sessions et cookies', 'Base de données SQLite', 'Sécurité et authentification'],
  },
  'Make-your-game': {
    skill: 'programmation de jeu en JavaScript vanilla',
    focus: 'boucle de jeu et manipulation du DOM',
    techPoints: ['Boucle de jeu requestAnimationFrame', 'Gestion des collisions', 'Manipulation du canvas ou DOM'],
  },
  'Real-time-forum': {
    skill: 'WebSockets et communication temps réel',
    focus: 'forum interactif avec messagerie instantanée',
    techPoints: ['Implémentation WebSocket', 'Gestion des événements en temps réel', 'Architecture client-serveur'],
  },
  'Graphql': {
    skill: 'requêtes GraphQL et visualisation de données',
    focus: 'consommation d\'API GraphQL et rendu de graphiques',
    techPoints: ['Requêtes et mutations GraphQL', 'Bibliothèques de visualisation (D3.js)', 'Authentification JWT'],
  },
  'Social-network': {
    skill: 'application web complète (réseau social)',
    focus: 'architecture, base de données et fonctionnalités sociales',
    techPoints: ['Système de follow/unfollow', 'Gestion des groupes et événements', 'Notifications temps réel'],
  },
  'Mini-framework': {
    skill: 'architecture de framework JavaScript',
    focus: 'réactivité et gestion du DOM virtuel',
    techPoints: ['Système de composants réactifs', 'Routeur côté client', 'Cycle de vie des composants'],
  },
  'Bomberman-dom': {
    skill: 'jeu multijoueur en JavaScript',
    focus: 'synchronisation multijoueur et gameplay',
    techPoints: ['WebSockets pour le multijoueur', 'Gestion des collisions et de la carte', 'Architecture de jeu'],
  },
  '0-shell': {
    skill: 'développement d\'un shell Unix en Rust',
    focus: 'appels système et parsing de commandes',
    techPoints: ['Parsing des commandes shell', 'Gestion des processus (fork/exec)', 'Redirection des entrées/sorties'],
  },
  'Smart-road': {
    skill: 'simulation de trafic et concurrence',
    focus: 'gestion multi-thread et simulation physique',
    techPoints: ['Concurrence et threads', 'Simulation de déplacements', 'Gestion des intersections'],
  },
  'Multiplayer-fps': {
    skill: 'jeu FPS multijoueur',
    focus: 'rendu 3D et synchronisation réseau',
    techPoints: ['Moteur de rendu 3D', 'Architecture réseau client-serveur', 'Gestion de l\'état de jeu'],
  },
  'Filler': {
    skill: 'algorithmique et stratégie de jeu',
    focus: 'bot de jeu et optimisation heuristique',
    techPoints: ['Algorithme de remplissage', 'Analyse de la grille de jeu', 'Stratégie et heuristiques'],
  },
  'RT': {
    skill: 'ray tracing et rendu 3D',
    focus: 'calculs optiques et rendu d\'images',
    techPoints: ['Algorithme de lancer de rayons', 'Gestion des matériaux et lumières', 'Optimisation des calculs'],
  },
};

function getProjectCtx(projectName: string) {
  return PROJECT_CONTEXT[projectName] ?? {
    skill: 'développement logiciel',
    focus: 'conception et implémentation',
    techPoints: ['Architecture du code', 'Qualité et lisibilité', 'Maîtrise des concepts clés'],
  };
}

// ─── Générateurs de résumés ───────────────────────────────────────────────────

function parseWarnings(w: unknown): string[] {
  if (Array.isArray(w)) return w;
  if (typeof w === 'string') {
    try { const p = JSON.parse(w); if (Array.isArray(p)) return p; } catch {}
  }
  return [];
}

function deterministicPick<T>(items: T[], seed: number): T {
  return items[seed % items.length];
}

function generateSummary(
  audit: { id: number; projectName: string; track: string; auditorName: string },
  results: { studentLogin: string; validated: boolean; absent: boolean; warnings: unknown }[],
): string {
  const ctx = getProjectCtx(audit.projectName);
  const total = results.length;
  const absent = results.filter(r => r.absent).length;
  const validated = results.filter(r => r.validated && !r.absent).length;
  const rate = total > absent ? Math.round((validated / (total - absent)) * 100) : 0;
  const allWarnings = results.flatMap(r => parseWarnings(r.warnings));
  const seed = audit.id;

  // ── Cas : tous validés, aucun warning ─────────────────────────────────────
  if (rate === 100 && allWarnings.length === 0 && absent === 0) {
    const variants = [
      () => `✅ **Points forts :**\n\n- Projet fonctionnel, tous les cas testés passent.\n- Bonne maîtrise de la ${ctx.skill}.\n- ${deterministicPick(ctx.techPoints, seed)} correctement acquis.\n- Explications claires et pertinentes lors de la review.\n\n👉 **Conclusion :**\n\nTravail de qualité, groupe en bonne progression.`,

      () => `✅ **Points positifs :**\n- Projet fonctionnel et validé.\n- ${deterministicPick(ctx.techPoints, seed + 1)} bien maîtrisé.\n- Code lisible et bien structuré.\n- Bonne compréhension du ${ctx.focus}.\n\n👉 **Travail solide, continue dans cette direction.**`,

      () => `### Débrief de Code Review\n\nLe projet est **bien compris** dans son ensemble. Le code est **fonctionnel**, **propre** et respecte la logique attendue du projet ${audit.projectName}. Les choix techniques sont cohérents et les **explications fournies sont claires**, ce qui facilite la lecture du travail réalisé.\n\n👏 **Très bon travail.**`,

      () => `- Code propre, fonctionnel et bien organisé.\n- Bonne maîtrise de la ${ctx.skill}.\n- ${deterministicPick(ctx.techPoints, seed + 2)} bien acquis.\n- Groupe à l'aise pour expliquer les choix techniques.\n\n👉 **Projet bien maîtrisé. Groupe en progression.**`,

      () => `✅ **Bilan positif :**\n\n- Projet ${audit.projectName} validé dans les règles.\n- Les ${total} membres du groupe maîtrisent le code produit.\n- Bonne répartition du travail au sein du groupe.\n- ${ctx.techPoints[seed % ctx.techPoints.length]} correctement abordé.\n\n👉 **Bon travail collectif.**`,
    ];
    return deterministicPick(variants, seed)();
  }

  // ── Cas : tous validés, mais warnings présents ────────────────────────────
  if (rate === 100 && allWarnings.length > 0) {
    const warnSummary = allWarnings.slice(0, 2).join('. ').toLowerCase();
    return `✅ **Points positifs :**\n- Projet fonctionnel et validé malgré les points soulevés.\n- Bonne maîtrise globale de la ${ctx.skill}.\n\n⚠️ **Points à améliorer :**\n- ${warnSummary}.\n\n👉 **Résultat satisfaisant. Les points d'amélioration identifiés devront être traités.**`;
  }

  // ── Cas : absents ─────────────────────────────────────────────────────────
  if (absent > 0 && rate === 100) {
    return `- ${validated} membre${validated > 1 ? 's' : ''} présent${validated > 1 ? 's' : ''} sur ${total}, audit réalisé sur les membres disponibles.\n- Code fonctionnel et bien maîtrisé par les membres présents.\n- Bonne compréhension de la ${ctx.skill}.\n\n👉 **Audit réalisé en l'absence de ${absent} membre${absent > 1 ? 's' : ''}. Résultat positif pour le groupe présent.**`;
  }

  // ── Cas : taux mixte (rate < 100) ─────────────────────────────────────────
  if (rate >= 75) {
    return `✅ **Points positifs :**\n- Majorité du groupe (${validated}/${total - absent}) valide le projet.\n- Bonne maîtrise globale de la ${ctx.skill}.\n\n⚠️ **Points à améliorer :**\n- Certains membres ont des lacunes sur ${ctx.focus}.\n- ${deterministicPick(ctx.techPoints, seed)} à consolider pour l'ensemble du groupe.\n\n👉 **Résultat globalement satisfaisant. Des progrès attendus sur les points identifiés.**`;
  }

  if (rate >= 50) {
    return `- Projet partiellement maîtrisé par le groupe (${validated}/${total - absent} validés).\n- Des lacunes identifiées sur ${ctx.focus}.\n- ${deterministicPick(ctx.techPoints, seed + 1)} insuffisamment maîtrisé par certains membres.\n- Un accompagnement complémentaire est recommandé.\n\n👉 **Résultat mitigé. Des efforts supplémentaires sont attendus sur la maîtrise du ${audit.projectName}.**`;
  }

  return `- Projet insuffisamment maîtrisé par le groupe (${validated}/${total - absent} validés).\n- Difficultés importantes sur ${ctx.focus}.\n- ${ctx.techPoints.join(', ')} : notions à reprendre.\n- Revoir les fondamentaux de la ${ctx.skill}.\n\n👉 **Résultat insuffisant. Un travail de fond est nécessaire pour maîtriser les concepts clés du projet.**`;
}

// ─── Générateurs de feedbacks individuels ────────────────────────────────────

function generateFeedback(
  student: { studentLogin: string; validated: boolean; absent: boolean; warnings: unknown },
  audit: { projectName: string; track: string },
  index: number,
): string {
  const ctx = getProjectCtx(audit.projectName);
  const warns = parseWarnings(student.warnings);
  const seed = student.studentLogin.charCodeAt(0) + index;

  if (student.absent) {
    const variants = [
      `Absent lors de l'audit. Un rattrapage devra être organisé.`,
      `Non présent lors de la session. À recontacter pour planifier un audit de rattrapage.`,
      `Absence constatée. La validation reste en attente d'un second passage.`,
    ];
    return deterministicPick(variants, seed);
  }

  if (!student.validated) {
    const variants = [
      `Des lacunes identifiées sur ${ctx.focus}. Un travail complémentaire sur ${deterministicPick(ctx.techPoints, seed)} est recommandé avant un prochain audit.`,
      `Compréhension insuffisante du projet lors de la review. Revoir les bases de la ${ctx.skill} et s'assurer de maîtriser le code produit.`,
      `Difficultés à expliquer les choix techniques. Un travail de fond sur ${ctx.focus} est nécessaire.`,
      `Non validé à cette session. Les notions liées à ${deterministicPick(ctx.techPoints, seed + 1)} doivent être consolidées.`,
    ];
    if (warns.length > 0) {
      return `Non validé. ${warns[0]}. Un accompagnement sur ${ctx.focus} est conseillé.`;
    }
    return deterministicPick(variants, seed);
  }

  // Validated
  if (warns.length > 0) {
    return `Projet validé. Point d'attention : ${warns[0].charAt(0).toLowerCase() + warns[0].slice(1)}. À corriger pour les prochains projets.`;
  }

  const positives = [
    `Bonne maîtrise du projet et du ${ctx.focus}. Explications claires et pertinentes.`,
    `Projet bien compris, code maîtrisé. Continue dans cette direction.`,
    `Bonne compréhension de la ${ctx.skill}. Présentation fluide lors de la review.`,
    `Code fonctionnel et bien expliqué. ${deterministicPick(ctx.techPoints, seed)} bien acquis.`,
    `Travail solide, projet maîtrisé. Bonne capacité à défendre les choix techniques.`,
    `Bonne maîtrise globale. ${deterministicPick(ctx.techPoints, seed + 1)} correctement assimilé.`,
    `Projet validé sans difficulté. Explications précises et code de qualité.`,
  ];
  return deterministicPick(positives, seed);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔍 Chargement des audits...\n');

  // Audits sans résumé
  const auditsWithoutSummary = await db.select().from(audits)
    .where(or(isNull(audits.summary), sql`${audits.summary} = ''`));

  // Résultats sans feedback
  const resultsWithoutFeedback = await db.select({ auditId: auditResults.auditId })
    .from(auditResults)
    .where(or(isNull(auditResults.feedback), sql`${auditResults.feedback} = ''`))
    .groupBy(auditResults.auditId);

  const auditIdsNeedingFeedback = new Set(resultsWithoutFeedback.map(r => r.auditId));
  const auditIdsWithoutSummary = new Set(auditsWithoutSummary.map(a => a.id));
  const allIds = [...new Set([...auditIdsWithoutSummary, ...auditIdsNeedingFeedback])];

  console.log(`📊 Audits sans résumé   : ${auditIdsWithoutSummary.size}`);
  console.log(`📊 Audits sans feedback : ${auditIdsNeedingFeedback.size}`);
  console.log(`📊 Total à traiter      : ${allIds.length}\n`);

  if (allIds.length === 0) {
    console.log('✅ Tout est déjà renseigné.');
    return;
  }

  const auditsToProcess = await db.select().from(audits).where(inArray(audits.id, allIds));
  const allResults = await db.select().from(auditResults).where(inArray(auditResults.auditId, allIds));

  const resultsByAudit = new Map<number, typeof allResults>();
  for (const r of allResults) {
    if (!resultsByAudit.has(r.auditId)) resultsByAudit.set(r.auditId, []);
    resultsByAudit.get(r.auditId)!.push(r);
  }

  let updated = 0;

  for (let i = 0; i < auditsToProcess.length; i++) {
    const audit = auditsToProcess[i];
    const results = resultsByAudit.get(audit.id) ?? [];
    const needsSummary = !audit.summary || audit.summary.trim() === '';
    const missingFeedbacks = results.filter(r => !r.feedback || r.feedback.trim() === '');

    process.stdout.write(`[${i + 1}/${auditsToProcess.length}] ${audit.track}/${audit.projectName} — `);

    if (needsSummary) {
      const summary = generateSummary(audit, results);
      await db.update(audits).set({ summary }).where(eq(audits.id, audit.id));
    }

    for (let j = 0; j < missingFeedbacks.length; j++) {
      const result = missingFeedbacks[j];
      const feedback = generateFeedback(result, audit, j);
      await db.update(auditResults).set({ feedback }).where(eq(auditResults.id, result.id));
    }

    console.log(`✅ résumé=${needsSummary ? 'généré' : 'ok'}, feedbacks=${missingFeedbacks.length}`);
    updated++;
  }

  console.log(`\n✅ Terminé : ${updated} audits mis à jour.`);
}

main().finally(() => pool.end());
