import { pgTable, serial, text, integer } from 'drizzle-orm/pg-core';

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  projectTimeWeek: integer('project_time_week').notNull(),
  category: text('category').notNull(),
  sort_index: integer('sort_index').default(0),
}); 