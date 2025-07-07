import { pgTable, serial, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const history = pgTable('history', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(), // planning, absence, employee, etc.
  action: text('action').notNull(), // create, update, delete
  userId: text('user_id').notNull(),
  userEmail: text('user_email').notNull(),
  date: timestamp('date').defaultNow().notNull(),
  entityId: text('entity_id').notNull(),
  details: jsonb('details').notNull(), // détails de l'action (avant/après, payload, etc.)
});

export interface History {
  id: number;
  type: string;
  action: string;
  userId: string;
  userEmail: string;
  date: Date;
  entityId: string;
  details: any;
} 