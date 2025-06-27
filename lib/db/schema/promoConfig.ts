import { pgTable, text, integer, date } from 'drizzle-orm/pg-core';

export const promoConfig = pgTable('promo_config', {
  key: text('key').primaryKey(),
  eventId: integer('event_id').notNull(),
  title: text('title').notNull(),
  start: date('start').notNull(),
  piscineJsStart: date('piscine_js_start'),
  piscineJsEnd: date('piscine_js_end'),
  piscineRustStart: date('piscine_rust_start'),
  piscineRustEnd: date('piscine_rust_end'),
  end: date('end').notNull(),
}); 