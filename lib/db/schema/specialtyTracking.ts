import { pgTable, serial, varchar, integer, jsonb, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * Suivi de la progression des étudiants par spécialité.
 * Chaque ligne = un étudiant × une spécialité × une promo.
 */
export const specialtyTracking = pgTable(
  'specialty_tracking',
  {
    id: serial('id').primaryKey(),
    login: varchar('login', { length: 100 }).notNull(),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    specialty: varchar('specialty', { length: 50 }).notNull(),
    promoId: varchar('promo_id', { length: 50 }).notNull(),
    /** Liste des projets avec statut et note */
    projects: jsonb('projects').$type<SpecialtyProject[]>().notNull().default([]),
    /** Nombre de projets complétés */
    completedCount: integer('completed_count').notNull().default(0),
    /** Nombre total de projets dans la spécialité */
    totalCount: integer('total_count').notNull().default(0),
    /** Projet en cours (ou null) */
    currentProject: varchar('current_project', { length: 100 }),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqueStudentSpecIdx: uniqueIndex('idx_specialty_tracking_unique').on(
      table.login,
      table.specialty,
      table.promoId
    ),
  })
);

export interface SpecialtyProject {
  name: string;
  grade: number | null;
  status: 'finished' | 'working' | 'not_started';
}
