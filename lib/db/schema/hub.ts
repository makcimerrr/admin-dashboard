import { pgTable, uuid, varchar, text, integer, timestamp, pgEnum, date, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum for task status
export const hubTaskStatusEnum = pgEnum('hub_task_status', ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']);

// Templates table - event templates with tasks
export const hubTemplates = pgTable('hub_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Tasks table - tasks belonging to templates
export const hubTasks = pgTable('hub_tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  templateId: uuid('template_id').notNull().references(() => hubTemplates.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  offsetDays: integer('offset_days').notNull().default(0),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Events table - instantiated events from templates
export const hubEvents = pgTable('hub_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  templateId: uuid('template_id').notNull().references(() => hubTemplates.id, { onDelete: 'restrict' }),
  name: varchar('name', { length: 255 }).notNull(),
  startDate: date('start_date').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// EventTasks table - task instances for specific events
export const hubEventTasks = pgTable('hub_event_tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id').notNull().references(() => hubEvents.id, { onDelete: 'cascade' }),
  taskId: uuid('task_id').notNull().references(() => hubTasks.id, { onDelete: 'cascade' }),
  status: hubTaskStatusEnum('status').notNull().default('NOT_STARTED'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  eventTaskIdx: uniqueIndex('hub_event_tasks_event_task_idx').on(table.eventId, table.taskId),
}));

// Assignments table - user assignments to tasks
export const hubAssignments = pgTable('hub_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id').notNull().references(() => hubTasks.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 64 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  taskUserIdx: uniqueIndex('hub_assignments_task_user_idx').on(table.taskId, table.userId),
}));

// Relations
export const hubTemplatesRelations = relations(hubTemplates, ({ many }) => ({
  tasks: many(hubTasks),
  events: many(hubEvents),
}));

export const hubTasksRelations = relations(hubTasks, ({ one, many }) => ({
  template: one(hubTemplates, {
    fields: [hubTasks.templateId],
    references: [hubTemplates.id],
  }),
  assignments: many(hubAssignments),
  eventTasks: many(hubEventTasks),
}));

export const hubEventsRelations = relations(hubEvents, ({ one, many }) => ({
  template: one(hubTemplates, {
    fields: [hubEvents.templateId],
    references: [hubTemplates.id],
  }),
  eventTasks: many(hubEventTasks),
}));

export const hubEventTasksRelations = relations(hubEventTasks, ({ one }) => ({
  event: one(hubEvents, {
    fields: [hubEventTasks.eventId],
    references: [hubEvents.id],
  }),
  task: one(hubTasks, {
    fields: [hubEventTasks.taskId],
    references: [hubTasks.id],
  }),
}));

export const hubAssignmentsRelations = relations(hubAssignments, ({ one }) => ({
  task: one(hubTasks, {
    fields: [hubAssignments.taskId],
    references: [hubTasks.id],
  }),
}));

// Types
export type HubTemplate = typeof hubTemplates.$inferSelect;
export type NewHubTemplate = typeof hubTemplates.$inferInsert;
export type HubTask = typeof hubTasks.$inferSelect;
export type NewHubTask = typeof hubTasks.$inferInsert;
export type HubEvent = typeof hubEvents.$inferSelect;
export type NewHubEvent = typeof hubEvents.$inferInsert;
export type HubEventTask = typeof hubEventTasks.$inferSelect;
export type NewHubEventTask = typeof hubEventTasks.$inferInsert;
export type HubAssignment = typeof hubAssignments.$inferSelect;
export type NewHubAssignment = typeof hubAssignments.$inferInsert;
