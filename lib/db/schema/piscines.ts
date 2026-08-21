import {
  pgTable,
  text,
  timestamp,
  serial,
  integer,
  boolean,
  varchar,
  real,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

/**
 * Piscines de sélection (piscine-go) — suivi des CANDIDATS.
 *
 * ⚠️ Ces personnes ne sont pas des apprenants : elles n'ont aucune ligne dans
 * `students` et ne doivent pas en avoir. Un candidat admis y entrera plus tard
 * par le circuit normal ; le lien se fait sur le login, jamais par une clé
 * étrangère.
 *
 * Miroir local du GraphQL Zone01, alimenté par cron : une session close doit
 * rester consultable, et un classement sur toute une session dépasse la
 * pagination de l'API. La source reste Zone01 — rien n'est saisi ici.
 *
 * Données nominatives : conservées sans purge automatique (choix explicite de
 * l'équipe, 2026-08-20). Si une politique de rétention est décidée plus tard,
 * c'est `piscine_candidates` (firstName/lastName/email) qu'il faudra purger ;
 * les notes et la décision d'admission peuvent rester, elles sont anonymisables
 * par simple effacement de ces trois colonnes.
 */

/** Décision d'admission telle que portée par Zone01 (`result.admin_selection`). */
export const ADMISSION_STATUSES = ['admis', 'refuse', 'en_cours'] as const;
export type AdmissionStatus = (typeof ADMISSION_STATUSES)[number];

/** Nature d'une épreuve, déduite du sous-événement Zone01. */
export const PISCINE_RESULT_KINDS = ['exercise', 'exam', 'project'] as const;
export type PiscineResultKind = (typeof PISCINE_RESULT_KINDS)[number];

// ─── Sessions ────────────────────────────────────────────────────────────────

export const piscineSessions = pgTable(
  'piscine_sessions',
  {
    /** `event.id` Zone01 : clé naturelle, stable, et évite tout doublon. */
    eventId: integer('event_id').primaryKey(),
    path: text('path').notNull(),
    /** Libellé lisible dérivé des dates (« Juillet 2026 »). */
    label: text('label').notNull(),
    startAt: timestamp('start_at'),
    endAt: timestamp('end_at'),
    /** Session de rattrapage (`piscine-go---retry`). */
    isRetry: boolean('is_retry').notNull().default(false),
    candidatesCount: integer('candidates_count').notNull().default(0),
    admittedCount: integer('admitted_count').notNull().default(0),
    syncedAt: timestamp('synced_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    byStart: index('idx_piscine_session_start').on(table.startAt),
  }),
);

// ─── Candidats ───────────────────────────────────────────────────────────────

export const piscineCandidates = pgTable(
  'piscine_candidates',
  {
    id: serial('id').primaryKey(),
    sessionEventId: integer('session_event_id')
      .notNull()
      .references(() => piscineSessions.eventId, { onDelete: 'cascade' }),
    login: text('login').notNull(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    email: text('email'),
    /** Niveau atteint dans la piscine (0 = n'a rien produit). */
    level: integer('level'),
    admission: varchar('admission', { length: 20 }).notNull().default('en_cours'),
    /** Nombre d'exercices validés / tentés : la progression brute. */
    exercisesDone: integer('exercises_done').notNull().default(0),
    exercisesTried: integer('exercises_tried').notNull().default(0),
    /**
     * Moyenne ABSOLUE des examens : `examPassed / examTotal` sur l'ensemble
     * des épreuves, et non la moyenne des ratios par examen. Un candidat qui
     * réussit 2/5 puis 7/10 vaut 9/15, pas (0.4 + 0.7)/2 — les examens n'ont
     * pas le même poids.
     */
    examAverage: real('exam_average'),
    /** Exercices réussis, tous examens confondus. */
    examPassed: integer('exam_passed'),
    /** Barème cumulé des examens passés (5 + 7 + 9 + 10 = 31 au complet). */
    examTotal: integer('exam_total'),
    lastActivityAt: timestamp('last_activity_at'),
    syncedAt: timestamp('synced_at').defaultNow().notNull(),
  },
  (table) => ({
    /** Un candidat n'apparaît qu'une fois par session. */
    uniquePerSession: uniqueIndex('idx_piscine_candidate_unique').on(
      table.sessionEventId,
      table.login,
    ),
    byLogin: index('idx_piscine_candidate_login').on(table.login),
    byAdmission: index('idx_piscine_candidate_admission').on(table.admission),
  }),
);

// ─── Résultats par épreuve ───────────────────────────────────────────────────

export const piscineResults = pgTable(
  'piscine_results',
  {
    id: serial('id').primaryKey(),
    candidateId: integer('candidate_id')
      .notNull()
      .references(() => piscineCandidates.id, { onDelete: 'cascade' }),
    /** Nom de l'épreuve côté Zone01 (« Exam 01 », « quad », « printalphabet »). */
    name: text('name').notNull(),
    kind: varchar('kind', { length: 20 }).notNull(),
    grade: real('grade'),
    /** Examens : exercices réussis pendant l'épreuve. */
    score: integer('score'),
    /** Examens : barème de l'épreuve (5, 7, 9 ou 10). */
    maxScore: integer('max_score'),
    isDone: boolean('is_done').notNull().default(false),
    /** Événement Zone01 d'origine : permet de remonter à la source. */
    eventId: integer('event_id'),
    updatedAt: timestamp('updated_at'),
  },
  (table) => ({
    /**
     * Une épreuve par candidat. Zone01 produit plusieurs `progress` pour un
     * exercice repassé : on ne garde que le plus récent, sinon le décompte
     * d'exercices faits est faux.
     */
    uniquePerCandidate: uniqueIndex('idx_piscine_result_unique').on(
      table.candidateId,
      table.name,
    ),
    byCandidate: index('idx_piscine_result_candidate').on(table.candidateId),
  }),
);

// ─── Saisie humaine ──────────────────────────────────────────────────────────

/**
 * Commentaire libre sur un candidat, et comptes rendus de projet.
 *
 * ⚠️ Tables SÉPARÉES du miroir : la synchro réécrit `piscine_candidates` et
 * `piscine_results` à chaque passage. Ranger une saisie humaine dedans
 * reviendrait à la perdre au prochain cron.
 */
export const piscineCandidateComments = pgTable('piscine_candidate_comments', {
  candidateId: integer('candidate_id')
    .primaryKey()
    .references(() => piscineCandidates.id, { onDelete: 'cascade' }),
  comment: text('comment').notNull(),
  author: text('author').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/** Projets faisant l'objet de comptes rendus. */
export const REVIEWED_PROJECTS = ['quad', 'sudoku', 'quadchecker'] as const;
export type ReviewedProject = (typeof REVIEWED_PROJECTS)[number];

/** Trois comptes rendus attendus par projet. */
export const REVIEW_SLOTS = [1, 2, 3] as const;

export const piscineProjectReviews = pgTable(
  'piscine_project_reviews',
  {
    id: serial('id').primaryKey(),
    candidateId: integer('candidate_id')
      .notNull()
      .references(() => piscineCandidates.id, { onDelete: 'cascade' }),
    project: text('project').notNull(),
    /** 1, 2 ou 3. */
    slot: integer('slot').notNull(),
    content: text('content').notNull(),
    author: text('author').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqueSlot: uniqueIndex('idx_piscine_review_unique').on(
      table.candidateId,
      table.project,
      table.slot,
    ),
    byCandidate: index('idx_piscine_review_candidate').on(table.candidateId),
  }),
);

export type PiscineCandidateComment = typeof piscineCandidateComments.$inferSelect;
export type PiscineProjectReview = typeof piscineProjectReviews.$inferSelect;

export type PiscineSession = typeof piscineSessions.$inferSelect;
export type NewPiscineSession = typeof piscineSessions.$inferInsert;
export type PiscineCandidate = typeof piscineCandidates.$inferSelect;
export type NewPiscineCandidate = typeof piscineCandidates.$inferInsert;
export type PiscineResult = typeof piscineResults.$inferSelect;
export type NewPiscineResult = typeof piscineResults.$inferInsert;
