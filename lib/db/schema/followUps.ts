import {
  pgTable,
  text,
  timestamp,
  serial,
  integer,
  boolean,
  varchar,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { students } from './students';
import { alternantContracts, alternantDocuments } from './alternants';

/**
 * Module « Suivi en entreprise » — échéances de suivi des alternants/stagiaires.
 *
 * Objectif : sortir la logique de relance de la tête d'une seule personne
 * (Notion + mémoire) pour la rendre calculée, tracée et auditable (point de
 * contrôle Qualiopi sur l'accompagnement des bénéficiaires).
 *
 * Chaîne : contrat → N échéances (jalons configurables) → relances tracées →
 * compte rendu qui clôt l'échéance.
 *
 * ⚠️ Ancrage : les échéances pointent sur `alternant_contracts.id`. La synchro
 * émargement doit donc préserver les IDs (upsert sur clé naturelle
 * studentId + source + startDate), cf. `lib/db/services/emargementSync.ts`.
 * Les comptes rendus, eux, sont ancrés sur `student_id` (NOT NULL) pour
 * survivre à la disparition d'un contrat : l'historique pédagogique ne doit
 * jamais être perdu.
 */

// ─── Statuts d'échéance ──────────────────────────────────────────────────────

export const MILESTONE_STATUSES = [
  'a_venir', // calculée, rien d'envoyé
  'relance_envoyee', // mail tuteur parti, en attente de créneau
  'rdv_planifie', // créneau confirmé (saisi ou détecté dans l'agenda)
  'realise', // compte rendu saisi → échéance close
  'annule', // hors périmètre (contrat rompu, jalon au-delà de la fin de contrat…)
] as const;

export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

/** Statuts qui n'attendent plus rien : ni relance, ni alerte interne. */
export const CLOSED_MILESTONE_STATUSES: MilestoneStatus[] = ['realise', 'annule'];

export const REMINDER_CHANNELS = ['email', 'teams', 'discord'] as const;
export type ReminderChannel = (typeof REMINDER_CHANNELS)[number];

/**
 * `manual` = 1re relance confirmée à la main, `relance` = envoi suivant.
 *
 * Il n'existe PAS de valeur « auto » : aucun mail ne peut partir vers une
 * entreprise partenaire sans confirmation humaine explicite. Le cron se
 * contente de signaler ce qu'il y a à relancer.
 */
export const REMINDER_KINDS = ['manual', 'relance'] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];

export const FOLLOW_UP_MODES = ['visite', 'visio', 'telephone', 'autre'] as const;
export type FollowUpMode = (typeof FOLLOW_UP_MODES)[number];

// ─── Jalons configurables ────────────────────────────────────────────────────

/**
 * Périodes de suivi, ÉDITABLES en base (jamais figées dans le code) : les
 * besoins pédagogiques évoluent. Seed initial : 3M / 6M / 1A / 18M / 2A.
 *
 * Désactiver (`isActive = false`) plutôt que supprimer : les échéances déjà
 * calculées gardent leur type.
 */
export const followUpMilestoneTypes = pgTable('follow_up_milestone_types', {
  code: varchar('code', { length: 20 }).primaryKey(), // 'M3', 'M6', 'M12'…
  label: text('label').notNull(), // « 3 mois », « 1 an »…
  offsetMonths: integer('offset_months').notNull(), // depuis la date de début de contrat
  displayOrder: integer('display_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Réglages du module (singleton, id = 1) ──────────────────────────────────

export const followUpSettings = pgTable('follow_up_settings', {
  id: integer('id').primaryKey().default(1),
  /** Alerte interne sur le hub / Teams X jours avant l'échéance. */
  internalAlertLeadDays: integer('internal_alert_lead_days').notNull().default(30),
  /** Relance mail au tuteur X jours avant l'échéance. */
  reminderLeadDays: integer('reminder_lead_days').notNull().default(21),
  /** 2e relance si aucun RDV planifié X jours après la 1re. */
  secondReminderAfterDays: integer('second_reminder_after_days').notNull().default(10),
  /** Lien de réservation (Google Appointment schedule, Calendly…) injecté dans le mail. */
  bookingUrl: text('booking_url'),
  /** Agenda surveillé pour détecter automatiquement les RDV réservés. */
  watchedCalendarId: text('watched_calendar_id'),
  senderName: text('sender_name'),
  senderEmail: text('sender_email'),
  replyToEmail: text('reply_to_email'),
  emailSubjectTemplate: text('email_subject_template'),
  emailBodyTemplate: text('email_body_template'),
  teamsAlertsEnabled: boolean('teams_alerts_enabled').notNull().default(true),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: text('updated_by'),
});

// ─── Échéances ───────────────────────────────────────────────────────────────

export const followUpMilestones = pgTable(
  'follow_up_milestones',
  {
    id: serial('id').primaryKey(),
    contractId: integer('contract_id')
      .notNull()
      .references(() => alternantContracts.id, { onDelete: 'cascade' }),
    /** Dénormalisé : permet de lister/filtrer par apprenant sans jointure. */
    studentId: integer('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    typeCode: varchar('type_code', { length: 20 })
      .notNull()
      .references(() => followUpMilestoneTypes.code, { onDelete: 'restrict' }),
    dueDate: timestamp('due_date').notNull(),
    status: varchar('status', { length: 30 }).notNull().default('a_venir'),
    statusChangedAt: timestamp('status_changed_at'),
    /** Date du créneau confirmé (saisie manuelle ou détection agenda). */
    scheduledAt: timestamp('scheduled_at'),
    /** Renseigné quand le compte rendu est saisi. */
    completedAt: timestamp('completed_at'),
    /** Événement Google Calendar rapproché (évite les re-détections). */
    calendarEventId: text('calendar_event_id'),
    cancelReason: text('cancel_reason'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    /** Un seul jalon de chaque type par contrat → réconciliation idempotente. */
    uniquePerContract: uniqueIndex('idx_follow_up_milestone_unique').on(
      table.contractId,
      table.typeCode,
    ),
    byDueDate: index('idx_follow_up_milestone_due').on(table.dueDate),
    byStatus: index('idx_follow_up_milestone_status').on(table.status),
    byStudent: index('idx_follow_up_milestone_student').on(table.studentId),
  }),
);

// ─── Relances envoyées (traçabilité / anti-doublon) ──────────────────────────

export const followUpReminders = pgTable(
  'follow_up_reminders',
  {
    id: serial('id').primaryKey(),
    milestoneId: integer('milestone_id')
      .notNull()
      .references(() => followUpMilestones.id, { onDelete: 'cascade' }),
    channel: varchar('channel', { length: 20 }).notNull(),
    kind: varchar('kind', { length: 20 }).notNull(),
    recipient: text('recipient'),
    subject: text('subject'),
    /** Email de l'utilisateur hub qui a CONFIRMÉ l'envoi. Jamais 'cron'. */
    sentBy: text('sent_by'),
    sentAt: timestamp('sent_at').defaultNow().notNull(),
    /** 'sent' | 'failed' — un échec reste tracé pour pouvoir réessayer. */
    status: varchar('status', { length: 20 }).notNull().default('sent'),
    error: text('error'),
  },
  (table) => ({
    byMilestone: index('idx_follow_up_reminder_milestone').on(table.milestoneId),
  }),
);

// ─── Comptes rendus de suivi ─────────────────────────────────────────────────

export const followUpReports = pgTable(
  'follow_up_reports',
  {
    id: serial('id').primaryKey(),
    /** Peut être null : un CR hors échéance planifiée reste saisissable. */
    milestoneId: integer('milestone_id').references(() => followUpMilestones.id, {
      onDelete: 'set null',
    }),
    /** Ancrage durable de l'historique (survit à la disparition du contrat). */
    studentId: integer('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    contractId: integer('contract_id').references(() => alternantContracts.id, {
      onDelete: 'set null',
    }),
    /** Snapshot : l'entreprise au moment du suivi, même si le contrat change. */
    companyName: text('company_name'),
    tutorName: text('tutor_name'),
    performedAt: timestamp('performed_at').notNull(),
    author: text('author').notNull(),
    mode: varchar('mode', { length: 20 }),
    content: text('content').notNull(),
    vigilancePoints: text('vigilance_points'),
    /** Pièce jointe éventuelle, stockée via le module documents existant. */
    documentId: integer('document_id').references(() => alternantDocuments.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    byStudent: index('idx_follow_up_report_student').on(table.studentId),
    byContract: index('idx_follow_up_report_contract').on(table.contractId),
  }),
);

// ─── Types ───────────────────────────────────────────────────────────────────

export type FollowUpMilestoneType = typeof followUpMilestoneTypes.$inferSelect;
export type NewFollowUpMilestoneType = typeof followUpMilestoneTypes.$inferInsert;

export type FollowUpSettings = typeof followUpSettings.$inferSelect;
export type NewFollowUpSettings = typeof followUpSettings.$inferInsert;

export type FollowUpMilestone = typeof followUpMilestones.$inferSelect;
export type NewFollowUpMilestone = typeof followUpMilestones.$inferInsert;

export type FollowUpReminder = typeof followUpReminders.$inferSelect;
export type NewFollowUpReminder = typeof followUpReminders.$inferInsert;

export type FollowUpReport = typeof followUpReports.$inferSelect;
export type NewFollowUpReport = typeof followUpReports.$inferInsert;
