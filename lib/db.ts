import 'server-only';

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { pgTable, text, timestamp, pgEnum, serial, integer } from 'drizzle-orm/pg-core';
import { count, eq, ilike, or, and, sql, desc, asc } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';

export const db = drizzle(neon(process.env.POSTGRES_URL!));

export const
  promosEnum = pgEnum('promos', [
  'P1 2022',
  'P1 2023',
  'P2 2023',
  'P1 2024'
]);

export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  last_name: text('last_name').notNull(),
  first_name: text('first_name').notNull(),
  login: text('login').notNull(),
  promos: text('promos').notNull(), // Utilisation d'une énumération appropriée ou d'une simple chaîne pour les promos
  availableAt: timestamp('available_at').notNull(),
});

export const studentProjects = pgTable('student_projects', {
  id: serial('id').primaryKey(),
  student_id: integer('student_id').references(() => students.id), // Lien vers la table students
  project_name: text('project_name').notNull(),
  progress_status: text('progress_status').notNull(),
  delay_level: text('delay_level').notNull()
});

export type SelectStudent = {
  // Colonnes de students
  id: number;
  last_name: string;
  first_name: string;
  login: string;
  promos: string;
  availableAt: Date;

  // Colonnes de studentProjects
  project_name: string | null; // Si la colonne peut être null
  progress_status: string | null;
  delay_level: string | null;
};

export const insertStudentSchema = createInsertSchema(students);

export async function getStudents(
  search: string,
  offset: number,
  promo: string,
  filter: string,
  direction: string
): Promise<{
  students: SelectStudent[];
  newOffset: number | null;
  currentOffset: number | null;
  previousOffset: number | null;
  totalStudents: number;
}> {
  const studentsPerPage = 20; // Nombre d'étudiants par page

  // Construire le filtre de promo
  let promoFilter = promo ? eq(students.promos, promo as 'P1 2022' | 'P1 2023' | 'P2 2023' | 'P1 2024') : null;

  // Construire le filtre de recherche
  let searchQuery = search ? `%${search}%` : null;
  let searchFilter = searchQuery
    ? or(
      ilike(students.login, searchQuery),
      ilike(students.first_name, searchQuery),
      ilike(students.last_name, searchQuery),
      ilike(studentProjects.project_name, searchQuery),
      ilike(studentProjects.progress_status, searchQuery)
    )
    : null;

  // Combiner promoFilter et searchFilter
  let finalFilter = promoFilter && searchFilter
    ? and(promoFilter, searchFilter)
    : promoFilter || searchFilter;

  // Liste des colonnes autorisées pour le tri
  const allowedFilters = [
    'last_name',
    'first_name',
    'login',
    'promos',
    'project_name',
    'progress_status',
    'delay_level',
    'availableAt',
  ];
  const orderByColumn = allowedFilters.includes(filter) ? filter : null;

  // Requête principale
  const studentsQuery = db
    .select({
      id: students.id,
      last_name: students.last_name,
      first_name: students.first_name,
      login: students.login,
      promos: students.promos,
      availableAt: students.availableAt,
      project_name: studentProjects.project_name,
      progress_status: studentProjects.progress_status,
      delay_level: studentProjects.delay_level,
    })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id));

  // Ajouter les filtres
  if (finalFilter) {
    studentsQuery.where(finalFilter);
  }

  // Ajouter le tri si applicable
  if (orderByColumn) {
    const columnToOrder =
      orderByColumn in students
        ? (students as any)[orderByColumn]
        : (studentProjects as any)[orderByColumn];

    if (columnToOrder) {
      studentsQuery.orderBy(
        direction === 'desc' ? desc(columnToOrder) : asc(columnToOrder)
      );
    }
  }

  // Exécuter la requête paginée
  const studentsResult = await studentsQuery
    .limit(studentsPerPage)
    .offset(offset);

  // Compter le total avec les filtres
  const totalQuery = db.select({ count: count() }).from(students);

  // Ajouter le filtre si nécessaire pour compter les étudiants
  if (finalFilter) {
    totalQuery.where(finalFilter);
  }

  const totalStudents = await totalQuery;

  // Calculer les nouveaux offsets pour la pagination
  const newOffset =
    studentsResult.length >= studentsPerPage ? offset + studentsPerPage : null;
  const previousOffset =
    offset >= studentsPerPage ? offset - studentsPerPage : null;

  return {
    students: studentsResult,
    currentOffset: offset,
    newOffset,
    previousOffset,
    totalStudents: totalStudents[0].count,
  };
}

export async function deleteStudentById(id: number) {
  console.log('Suppression de l\'étudiant avec l\'ID:', id);
  // await db.delete(students).where(eq(students.id, id));
}

export async function updateStudentProject(login: string, project_name: string, project_status: string, delay_level: string) {
  // Get the student ID from the login
  const student = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.login, login))
    .limit(1);  // Removed .run()

  // Check if the student exists
  if (!student || student.length === 0) {
    throw new Error(`Student with login "${login}" not found.`);
  }

  // Get the student ID
  const studentId = student[0].id;

  // Update the project details in the studentProjects table
  await db
    .update(studentProjects)
    .set({
      project_name,
      progress_status: project_status,
      delay_level: delay_level
    })
    .where(eq(studentProjects.student_id, studentId));  // Removed .run()

  console.log(`Project for student ${login} has been updated.`);
}

export const updates = pgTable('updates', {
  id: serial('id').primaryKey(),
  last_update: timestamp('last_update').notNull(),
  event_id: text('event_id').notNull()
});

// Typage pour les résultats renvoyés
export interface Update {
  last_update: Date;
  event_id: string;
}
/**
 * Mettre à jour la date de `last_update` dans la table `updates`.
 */
export async function updateLastUpdate(eventId: string) {
  const now = new Date();
  await db.insert(updates).values({ last_update: now, event_id: eventId });
  // console.log('Last update time has been set to:', now, 'for event ID:', eventId);
  return { last_update: now, event_id: eventId }; // Retourne la date mise à jour avec l'event_id
}

/**
 * Récupérer la dernière date de mise à jour depuis la table `updates`.
 */
export async function getAllUpdates(): Promise<Update[]> {
  const updatesList = await db
    .select({
      eventId: updates.event_id,
      lastUpdate: sql<Date>`MAX(${updates.last_update})`.as('lastUpdate'),
    })
    .from(updates)
    .groupBy(updates.event_id);

  // Transforme les résultats pour respecter la structure
  return updatesList.map(update => ({
    last_update: update.lastUpdate,
    event_id: update.eventId,
  }));
}