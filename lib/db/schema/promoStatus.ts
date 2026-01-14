import { pgTable, text, integer, jsonb, timestamp, date } from 'drizzle-orm/pg-core';

export const promoStatus = pgTable('promo_status', {
  promoKey: text('promo_key').primaryKey(),
  status: text('status').notNull(),
  promotionName: text('promotion_name').notNull(),
  currentProject: text('current_project'),
  progress: integer('progress').default(0),
  agenda: jsonb('agenda').$type<string[]>(),
  startDate: date('start_date'),
  endDate: date('end_date'),
  lastUpdated: timestamp('last_updated', { withTimezone: true }).defaultNow(),
});