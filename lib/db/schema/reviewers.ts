import { pgTable, serial, varchar, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const reviewers = pgTable('reviewers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  planningUrl: varchar('planning_url', { length: 500 }).notNull(),
  tracks: jsonb('tracks').$type<string[]>().notNull().default(['Golang', 'Javascript', 'Rust', 'Java']),
  calendarId: varchar('calendar_id', { length: 300 }),
  eventPrefix: varchar('event_prefix', { length: 200 }),
  excludedPromos: jsonb('excluded_promos').$type<string[]>().notNull().default([]),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Reviewer = typeof reviewers.$inferSelect;
export type NewReviewer = typeof reviewers.$inferInsert;
