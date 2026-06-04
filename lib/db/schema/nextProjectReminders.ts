import { pgTable, serial, varchar, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * Rappels « projet suivant » (next-project grouping reminders)
 *
 * Quand un étudiant a terminé un projet mais n'a toujours pas de groupe sur le
 * projet suivant après ~1 semaine, on lui envoie un DM Discord. Cette table
 * sert à :
 * - dater la 1ʳᵉ détection (Zone01 ne fournit pas de date) → `detectedAt`
 * - garantir l'idempotence (un seul DM par étudiant/promo/projet suivant)
 *   via `notifiedAt` + l'index unique.
 */
export const nextProjectReminders = pgTable('next_project_reminders', {
  id: serial('id').primaryKey(),
  login: varchar('login', { length: 100 }).notNull(),
  promoId: varchar('promo_id', { length: 50 }).notNull(),
  nextProjectName: varchar('next_project_name', { length: 100 }).notNull(),
  detectedAt: timestamp('detected_at').defaultNow().notNull(),
  notifiedAt: timestamp('notified_at'),
}, (table) => ({
  uniqueDetection: uniqueIndex('idx_npr_unique').on(
    table.login,
    table.promoId,
    table.nextProjectName,
  ),
}));

export type NextProjectReminder = typeof nextProjectReminders.$inferSelect;
export type NewNextProjectReminder = typeof nextProjectReminders.$inferInsert;
