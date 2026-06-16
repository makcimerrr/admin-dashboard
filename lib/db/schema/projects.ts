import { pgTable, serial, text, integer, boolean } from 'drizzle-orm/pg-core';

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  projectTimeWeek: integer('project_time_week').notNull(),
  category: text('category').notNull(),
  sort_index: integer('sort_index').default(0),
  optional: boolean('optional').default(false).notNull(),
  // Projet sans code-review staff → exclu des relances « Code review à réserver »
  // (notify-audit-groups), même s'il est obligatoire. Ex. go-reloaded, graphql.
  noCodeReview: boolean('no_code_review').default(false).notNull(),
}); 