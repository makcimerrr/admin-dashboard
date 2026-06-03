import { pgTable, varchar, integer, timestamp } from 'drizzle-orm/pg-core';

/**
 * Chantier B — objectifs hebdomadaires de code-reviews par promo.
 * `promoId` = eventId Zone01 (string), cohérent avec audits.promoId /
 * group_statuses.promoId. Une ligne par promo.
 */
export const promoCrTargets = pgTable('promo_cr_targets', {
  promoId: varchar('promo_id', { length: 50 }).primaryKey(),
  weeklyTarget: integer('weekly_target').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type PromoCrTarget = typeof promoCrTargets.$inferSelect;
export type NewPromoCrTarget = typeof promoCrTargets.$inferInsert;
