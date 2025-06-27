import { pgTable, text } from 'drizzle-orm/pg-core';

export const promoStatus = pgTable('promo_status', {
  promoKey: text('promo_key').primaryKey(),
  status: text('status').notNull(),
}); 