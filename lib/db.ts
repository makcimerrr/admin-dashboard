import 'server-only';

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { pgTable, text, timestamp, pgEnum, serial, integer } from 'drizzle-orm/pg-core';
import { count, eq, ilike, or, and } from 'drizzle-orm';
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
  promo: string
): Promise<{
  students: SelectStudent[];
  newOffset: number | null;
  currentOffset: number | null;
  previousOffset: number | null;
  totalStudents: number;
}> {
  const studentsPerPage = 20; // Nombre d'étudiants par page

  // Construire la condition pour le filtre de la promo
  let promoFilter = promo ? eq(students.promos, promo as 'P1 2022' | 'P1 2023' | 'P2 2023' | 'P1 2024') : null;

  // Construire la condition pour la recherche par nom, login
  let searchQuery = search ? `%${search}%` : null;
  let searchFilter = searchQuery
    ? or(
      ilike(students.login, searchQuery),
      ilike(students.first_name, searchQuery),
      ilike(students.last_name, searchQuery)
    )
    : null;

  // Si une promo et une recherche sont spécifiées, combiner les filtres
  let finalFilter = promoFilter && searchFilter
    ? and(promoFilter, searchFilter)
    : promoFilter || searchFilter; // Si l'un ou l'autre est null, utiliser l'autre

  // Si aucun filtre n'est appliqué, on renvoie tous les étudiants avec pagination
  if (!finalFilter) {
    const totalStudents = await db.select({ count: count() }).from(students);
    const moreStudents = await db
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
      .leftJoin(studentProjects, eq(students.id, studentProjects.student_id)) // Jointure avec student_projects
      .limit(studentsPerPage)
      .offset(offset);

    const newOffset =
      moreStudents.length >= studentsPerPage ? offset + studentsPerPage : null;
    const previousOffset =
      offset >= studentsPerPage ? offset - studentsPerPage : null;

    return {
      students: moreStudents,
      currentOffset: offset,
      newOffset: newOffset,
      previousOffset: previousOffset,
      totalStudents: totalStudents[0].count
    };
  }

  // Si un filtre est appliqué, faire la recherche avec pagination
  const studentsResult = await db
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
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id)) // Jointure avec student_projects
    .where(finalFilter)
    .limit(studentsPerPage) // Limiter à 5 résultats par page
    .offset(offset);

  const totalStudents = await db
    .select({ count: count() })
    .from(students)
    .where(finalFilter);

  // Calculer le nouveau offset pour la prochaine page
  const newOffset =
    studentsResult.length >= studentsPerPage
      ? offset + studentsPerPage
      : null;

  // Calculer l'offset précédent
  const previousOffset =
    offset >= studentsPerPage ? offset - studentsPerPage : null;

  return {
    students: studentsResult,
    newOffset,
    previousOffset,
    currentOffset: offset,
    totalStudents: totalStudents[0].count
  };
}

export async function deleteStudentById(id: number) {
  console.log('Suppression de l\'étudiant avec l\'ID:', id);
  // await db.delete(students).where(eq(students.id, id));
}

export async function updateStudentProject(login: string, project_name: string, project_status: string) {
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
      delay_level: 'en retard' // Example default value, can be customized
    })
    .where(eq(studentProjects.student_id, studentId));  // Removed .run()

  console.log(`Project for student ${login} has been updated.`);
}