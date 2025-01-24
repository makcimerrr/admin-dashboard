import 'server-only';

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  serial,
  integer
} from 'drizzle-orm/pg-core';
import {
  count,
  eq,
  ilike,
  or,
  and,
  sql,
  desc,
  asc,
  SQLWrapper,
  SQL
} from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';

export const db = drizzle(neon(process.env.POSTGRES_URL!));

export const promosEnum = pgEnum('promos', [
  'P1 2022',
  'P1 2023',
  'P2 2023',
  'P1 2024'
]);

export const promotions = pgTable('promotions', {
  promoId: text('promo_id').primaryKey(), // ID unique pour chaque promotion
  name: text('name').unique().notNull() // Nom unique de la promo (clé utilisée dans la référence)
});

export const delayStatus = pgTable('delay_status', {
  id: serial('id').primaryKey(), // Clé primaire auto-incrémentée
  promoId: text('promo_id')
    .notNull()
    .references(() => promotions.promoId), // Clé étrangère vers promotions
  lateCount: integer('late_count').default(0), // Nombre d'étudiants en retard
  goodLateCount: integer('good_late_count').default(0), // Retard raisonnable
  advanceLateCount: integer('advance_late_count').default(0), // Retard avancé
  specialityCount: integer('speciality_count').default(0), // Nombre de spécialités
  lastUpdate: timestamp('last_update').defaultNow() // Date de la dernière mise à jour
});

export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  last_name: text('last_name').notNull(),
  first_name: text('first_name').notNull(),
  login: text('login').notNull(),
  availableAt: timestamp('available_at').notNull(),
  promoName: text('promo_name')
    .notNull()
    .references(() => promotions.name) // Référence vers la table promotions
});

export const studentProjects = pgTable('student_projects', {
  id: serial('id').primaryKey(),
  student_id: integer('student_id').references(() => students.id), // Lien vers la table students
  project_name: text('project_name').notNull(),
  progress_status: text('progress_status').notNull(),
  delay_level: text('delay_level').notNull()
});

/**
 * Ajoute une promotion à la base de données.
 * @param promoId - ID unique de la promotion.
 * @param name - Nom ou description de la promotion.
 * @returns Un message de succès ou une erreur si la promo existe déjà.
 */
export async function addPromotion(
  promoId: string,
  name: string
): Promise<string> {
  try {
    // Vérifie si la promotion existe déjà
    const existingPromo = await db
      .select()
      .from(promotions)
      .where(eq(promotions.promoId, promoId))
      .execute();

    if (existingPromo.length > 0) {
      return `La promotion avec l'ID "${promoId}" existe déjà.`;
    }

    // Ajoute la nouvelle promotion
    await db.insert(promotions).values({ promoId, name }).execute();

    return `Promotion "${name}" (ID: ${promoId}) ajoutée avec succès.`;
  } catch (error) {
    console.error("Erreur lors de l'ajout de la promotion:", error);
    throw new Error("Impossible d'ajouter la promotion.");
  }
}

/**
 * Initialise les compteurs de statut de retard pour une promotion spécifique.
 * @param promoId L'ID unique de la promotion.
 */
export async function addDelayCountersForPromo(
  promoId: string
): Promise<string> {
  try {
    // Vérifier si la promo a déjà des compteurs dans la table delay_status
    const existingEntry = await db
      .select()
      .from(delayStatus)
      .where(eq(delayStatus.promoId, promoId));

    if (existingEntry.length > 0) {
      return `Les compteurs pour la promotion ${promoId} existent déjà.`;
    }

    // Insérer une nouvelle ligne pour la promotion avec les compteurs initialisés à 0
    await db.insert(delayStatus).values({
      promoId,
      lateCount: 0,
      goodLateCount: 0,
      advanceLateCount: 0,
      specialityCount: 0,
      lastUpdate: new Date()
    });

    return `Les compteurs pour la promotion ${promoId} ont été ajoutés avec succès.`;
  } catch (error) {
    console.error('Erreur lors de l’ajout des compteurs :', error);
    throw new Error('Erreur lors de l’ajout des compteurs pour la promotion.');
  }
}

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
  direction: string,
  status: string | null,
  delayLevel: string | null
): Promise<{
  students: SelectStudent[];
  newOffset: number | null;
  currentOffset: number | null;
  previousOffset: number | null;
  totalStudents: number;
}> {
  const studentsPerPage = 20;

  // Filtrage par promo
  // Recherche de la promo dans la table promotions
  const promoExists = await db
    .select()
    .from(promotions)
    .where(eq(promotions.name, promo))
    .limit(1)
    .execute();

  // Si la promo existe, effectuer la vérification sur la table students
  let promoFilter =
    promoExists.length > 0 ? eq(students.promoName, promo) : null;

  // Filtre par statut
  const statusFilter = status
    ? eq(studentProjects.progress_status, status)
    : null;
  const delayLevelFilter = delayLevel
    ? eq(studentProjects.delay_level, delayLevel)
    : null;

  // Filtre de recherche
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

  // Combinaison des filtres (promo, recherche, status)
  const filters = [
    promoFilter,
    searchFilter,
    statusFilter,
    delayLevelFilter
  ].filter((filter) => filter != null);
  let finalFilter: SQL<unknown> | undefined =
    filters.length > 0 ? and(...filters) : undefined;

  const allowedFilters = [
    'last_name',
    'first_name',
    'login',
    'promos',
    'project_name',
    'progress_status',
    'delay_level',
    'availableAt'
  ];
  const orderByColumn = allowedFilters.includes(filter) ? filter : null;

  // Requête pour récupérer les étudiants avec les filtres et la jointure
  const studentsQuery = db
    .select({
      id: students.id,
      last_name: students.last_name,
      first_name: students.first_name,
      login: students.login,
      promos: students.promoName,
      availableAt: students.availableAt,
      project_name: studentProjects.project_name,
      progress_status: studentProjects.progress_status,
      delay_level: studentProjects.delay_level
    })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id));

  // Appliquer les filtres sur la liste des étudiants
  if (finalFilter) {
    studentsQuery.where(finalFilter);
  }

  // Appliquer le tri, si spécifié
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

  // Récupérer les résultats paginés
  const studentsResult = await studentsQuery
    .limit(studentsPerPage)
    .offset(offset);

  // Requête de comptage des étudiants avec les mêmes filtres appliqués
  const totalQuery = db
    .select({ count: count() })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id));

  // Ajouter le même filtre que pour la récupération des étudiants
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
    totalStudents: totalStudents[0].count
  };
}

export async function deleteStudentById(id: number) {
  console.log("Suppression de l'étudiant avec l'ID:", id);
  // await db.delete(students).where(eq(students.id, id));
}

export async function updateStudentProject(
  login: string,
  project_name: string,
  project_status: string,
  delay_level: string
) {
  // Get the student ID from the login
  const student = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.login, login))
    .limit(1); // Removed .run()

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
    .where(eq(studentProjects.student_id, studentId)); // Removed .run()

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
      lastUpdate: sql<Date>`MAX(
      ${updates.last_update}
      )`.as('lastUpdate')
    })
    .from(updates)
    .groupBy(updates.event_id);

  // Transforme les résultats pour respecter la structure
  return updatesList.map((update) => ({
    last_update: update.lastUpdate,
    event_id: update.eventId
  }));
}
