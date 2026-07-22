import { pgTable, serial, varchar, timestamp, jsonb } from 'drizzle-orm/pg-core';

/** Créneau d'un jour de roulement (même forme que TimeSlot des schedules). */
export type RotationSlot = {
  start: string;
  end: string;
  isWorking: boolean;
  type: 'work';
};

/** Une semaine de roulement : employeeId → jour (lundi…dimanche) → créneaux. */
export type RotationWeek = Record<string, Record<string, RotationSlot[]>>;

/**
 * Roulements de planning ÉDITABLES (remplace les templates hardcodés
 * d'apply-rotation). Un roulement = un cycle de N semaines qui se répète ;
 * une « exception » se modélise comme un roulement d'1 semaine appliqué sur
 * la plage voulue. Clés des semaines = employees.id (robuste aux renommages).
 */
export const rotations = pgTable('rotations', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: varchar('description', { length: 500 }),
  weeks: jsonb('weeks').$type<RotationWeek[]>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Rotation = typeof rotations.$inferSelect;
