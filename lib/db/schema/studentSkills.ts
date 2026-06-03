import {
  pgTable,
  serial,
  varchar,
  integer,
  jsonb,
  timestamp,
  text,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

/**
 * Chantier A — Skills & appétence par étudiant (Gitea).
 *
 * Deux tables :
 *  - `student_gitea_profiles` : snapshot d'activité Gitea par étudiant (1 ligne
 *    par login). Rempli par le cron /api/cron/scan-gitea.
 *      Palier 1 (API deno, dispo) : métriques d'activité depuis la heatmap.
 *      Palier 2 (token Gitea) : breakdown langages (`languages`) + reposCount.
 *  - `student_skills` : compétences/appétences dérivées (plusieurs lignes par
 *    login). Rempli par l'étape d'analyse (Palier 2 : synthèse Claude).
 */

export interface GiteaLanguageBreakdown {
  /** Langage → octets (ou %) — null tant que le Palier 2 (token Gitea) n'est pas branché. */
  [language: string]: number;
}

export const studentGiteaProfiles = pgTable(
  'student_gitea_profiles',
  {
    id: serial('id').primaryKey(),
    login: varchar('login', { length: 100 }).notNull(),

    // ── Palier 1 : métriques d'activité (heatmap deno) ──
    totalContributions: integer('total_contributions').notNull().default(0),
    activeDays: integer('active_days').notNull().default(0),
    contributions30d: integer('contributions_30d').notNull().default(0),
    contributions90d: integer('contributions_90d').notNull().default(0),
    currentStreakDays: integer('current_streak_days').notNull().default(0),
    longestStreakDays: integer('longest_streak_days').notNull().default(0),
    lastActivityAt: timestamp('last_activity_at'),

    /** Score d'engagement 0–100 dérivé de l'activité (proxy d'appétence global). */
    engagementScore: integer('engagement_score').notNull().default(0),
    /** Libellé synthétique : 'tres_actif' | 'actif' | 'modere' | 'faible' | 'inactif'. */
    affinityLabel: varchar('affinity_label', { length: 30 }).notNull().default('inactif'),

    // ── Palier 2 : enrichissement token Gitea (null tant que non branché) ──
    reposCount: integer('repos_count'),
    languages: jsonb('languages').$type<GiteaLanguageBreakdown | null>(),

    // ── Synthèse IA (opt-in) : narratif court généré par LLM ──
    aiSummary: text('ai_summary'),
    aiSummaryAt: timestamp('ai_summary_at'),

    /** Réponse brute conservée pour debug / ré-analyse. */
    raw: jsonb('raw'),
    fetchedAt: timestamp('fetched_at').defaultNow().notNull(),
  },
  (table) => ({
    loginIdx: uniqueIndex('idx_gitea_profiles_login').on(table.login),
  }),
);

export const studentSkills = pgTable(
  'student_skills',
  {
    id: serial('id').primaryKey(),
    login: varchar('login', { length: 100 }).notNull(),

    /** 'language' | 'framework' | 'domain' | 'tool' | 'track' */
    category: varchar('category', { length: 30 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),

    /** Niveau de maîtrise estimé 0–100. */
    level: integer('level').notNull().default(0),
    /** Appétence/intérêt estimé 0–100. */
    affinity: integer('affinity').notNull().default(0),

    /** Preuves (repos, projets, signaux d'audit) ayant servi à l'estimation. */
    evidence: jsonb('evidence').$type<string[]>().default([]),
    /** 'gitea' | 'cursus' | 'audit' | 'ai'. */
    source: varchar('source', { length: 20 }).notNull().default('gitea'),

    computedAt: timestamp('computed_at').defaultNow().notNull(),
  },
  (table) => ({
    loginIdx: index('idx_student_skills_login').on(table.login),
    uniqueSkill: uniqueIndex('idx_student_skills_unique').on(
      table.login,
      table.category,
      table.name,
    ),
  }),
);

export type StudentGiteaProfile = typeof studentGiteaProfiles.$inferSelect;
export type NewStudentGiteaProfile = typeof studentGiteaProfiles.$inferInsert;
export type StudentSkill = typeof studentSkills.$inferSelect;
export type NewStudentSkill = typeof studentSkills.$inferInsert;

export type AffinityLabel = 'tres_actif' | 'actif' | 'modere' | 'faible' | 'inactif';
