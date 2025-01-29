import 'server-only';

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  serial,
  integer, varchar
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
  SQLWrapper, SQL,
} from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';

export const db = drizzle(neon(process.env.POSTGRES_URL!));

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name : varchar('name', { length: 255 }),
  username : varchar('username', { length: 255 }),
  password: varchar('password', { length: 255 }).notNull()
});

/**
 * Retrieves a user from the database by email and password hash.
 * @param email - The email of the user.
 * @param passwordHash - The hashed password of the user.
 * @returns The user object if found, otherwise null.
 */
export async function getUserFromDb(email: string, passwordHash: string) {
  try {
    const user = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.password, passwordHash)))
      .limit(1)
      .execute();

    return user.length > 0 ? user[0] : null;
  } catch (error) {
    console.error('Error fetching user from database:', error);
    throw new Error('Unable to fetch user from database.');
  }
}

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

export const delayStatus = pgTable('delays_status', {
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

export async function getAverageDelaysByMonth(promoId: string) {
  let result;
  return (result = await db
    .select({
      month: sql`DATE_TRUNC('month', ${delayStatus.lastUpdate})`.as('month'),
      avgLateCount: sql`AVG(${delayStatus.lateCount})`.as('avgLateCount'),
      avgGoodLateCount: sql`AVG(${delayStatus.goodLateCount})`.as(
        'avgGoodLateCount'
      )
    })
    .from(delayStatus)
    .where(sql`${delayStatus.promoId} = ${promoId}`)
    .groupBy(sql`DATE_TRUNC('month', ${delayStatus.lastUpdate})`)
    .orderBy(sql`DATE_TRUNC('month', ${delayStatus.lastUpdate})`));
}

export async function getDelayStatus(promoId: string): Promise<{
  lateCount: number;
  goodLateCount: number;
  advanceLateCount: number;
  specialityCount: number;
}> {
  try {
    // Récupérer les données de delayStatus en fonction du promoId
    const delayStatusData = await db
      .select({
        lateCount: delayStatus.lateCount,
        goodLateCount: delayStatus.goodLateCount,
        advanceLateCount: delayStatus.advanceLateCount,
        specialityCount: delayStatus.specialityCount
      })
      .from(delayStatus)
      .where(eq(delayStatus.promoId, promoId))
      .execute();

    // Vérifier si un résultat a été trouvé
    if (delayStatusData.length === 0) {
      throw new Error(
        `Aucun statut de retard trouvé pour la promotion avec l'ID "${promoId}".`
      );
    }

    // Retourner les valeurs du premier résultat trouvé
    return {
      lateCount: delayStatusData[0].lateCount || 0,
      goodLateCount: delayStatusData[0].goodLateCount || 0,
      advanceLateCount: delayStatusData[0].advanceLateCount || 0,
      specialityCount: delayStatusData[0].specialityCount || 0
    };
  } catch (error) {
    console.error(
      'Erreur lors de la recherche des compteurs de retard:',
      error
    );
    throw new Error('Impossible de trouver les compteurs de retard.');
  }
}

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
 * Supprime une promotion de la base de données.
 * @param key - Clé de la promotion.
 * @returns Un message de succès ou une erreur si la promo n'existe pas.
 */
export async function deletePromotion(key: string): Promise<string> {
  try {
    // Vérifier si la promotion existe
    const existingPromo = await db
      .select()
      .from(promotions)
      .where(eq(promotions.name, key))
      .execute();

    if (existingPromo.length === 0) {
      return `La promotion avec le nom "${key}" n'existe pas.`;
    }

    // Supprimer la promotion
    await db
      .delete(promotions)
      .where(eq(promotions.name, key))
      .execute();

    return `Promotion "${key}" supprimée avec succès.`;
  } catch (error) {
    console.error('Erreur lors de la suppression de la promotion:', error);
    throw new Error('Impossible de supprimer la promotion.');
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
  let promoFilter = promo ? eq(students.promoName, promo) : null;

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

  // Mise à jour ou insertion dans delay_status pour chaque promo si promo est vide
  if (!promo) {
    // Récupérer toutes les promotions
    const allPromos = await db.select().from(promotions);

    for (const promo of allPromos) {
      const promoId = promo.promoId;
      const promoFilter = eq(students.promoName, promo.name);

      // Vérifier si une mise à jour récente existe
      const lastUpdateRecord = await db
        .select({ lastUpdate: delayStatus.lastUpdate })
        .from(delayStatus)
        .where(eq(delayStatus.promoId, promoId))
        .orderBy(desc(delayStatus.lastUpdate))
        .limit(1)
        .execute();

      const lastUpdate = lastUpdateRecord[0]?.lastUpdate || null;

      // Vérifier si une mise à jour a déjà été effectuée dans les 24 dernières heures
      if (
        lastUpdate &&
        new Date().getTime() - new Date(lastUpdate).getTime() <
          24 * 60 * 60 * 1000
      ) {
        continue; // Passer à la prochaine promotion
      }

      // Obtenir les comptages groupés par `delay_level`
      const delayCounts = await db
        .select({
          delay_level: studentProjects.delay_level,
          count: count()
        })
        .from(students)
        .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
        .where(promoFilter)
        .groupBy(studentProjects.delay_level)
        .execute();

      // Construire les valeurs de comptage
      const countsMap = delayCounts.reduce(
        (acc, row) => {
          if (row.delay_level === 'bien') acc.goodLateCount = row.count;
          else if (row.delay_level === 'en retard') acc.lateCount = row.count;
          else if (row.delay_level === 'en avance')
            acc.advanceLateCount = row.count;
          else if (row.delay_level === 'spécialité')
            acc.specialityCount = row.count;
          return acc;
        },
        {
          goodLateCount: 0,
          lateCount: 0,
          advanceLateCount: 0,
          specialityCount: 0
        }
      );

      // Insérer ou mettre à jour les données dans delayStatus
      await db.insert(delayStatus).values({
        promoId,
        lateCount: countsMap.lateCount,
        goodLateCount: countsMap.goodLateCount,
        advanceLateCount: countsMap.advanceLateCount,
        specialityCount: countsMap.specialityCount,
        lastUpdate: new Date()
      });
    }
  } else {
    // Nouvelle logique pour une promotion spécifique
    const promoFilter = eq(students.promoName, promo);

    // Récupérer l'ID de la promo
    const promoRecord = await db
      .select({ promoId: promotions.promoId })
      .from(promotions)
      .where(eq(promotions.name, promo))
      .limit(1)
      .execute();

    if (promoRecord.length === 0) {
      console.error(`Promotion "${promo}" non trouvée.`);
    } else {
      const promoId = promoRecord[0].promoId;

      // Vérifier la dernière mise à jour pour la promo
      const lastUpdateRecord = await db
        .select({ lastUpdate: delayStatus.lastUpdate })
        .from(delayStatus)
        .where(eq(delayStatus.promoId, promoId))
        .orderBy(desc(delayStatus.lastUpdate))
        .limit(1)
        .execute();

      const lastUpdate = lastUpdateRecord[0]?.lastUpdate || null;

      // Continuer seulement si aucune mise à jour récente n'existe
      if (
        lastUpdate &&
        new Date().getTime() - new Date(lastUpdate).getTime() <
          24 * 60 * 60 * 1000
      ) {
        console.log(`Mise à jour ignorée pour la promo ${promo}.`);
      } else {
        const delayCounts = await db
          .select({
            delay_level: studentProjects.delay_level,
            count: count()
          })
          .from(students)
          .leftJoin(
            studentProjects,
            eq(students.id, studentProjects.student_id)
          )
          .where(promoFilter)
          .groupBy(studentProjects.delay_level)
          .execute();

        const countsMap = delayCounts.reduce(
          (acc, row) => {
            if (row.delay_level === 'bien') acc.goodLateCount = row.count;
            else if (row.delay_level === 'en retard') acc.lateCount = row.count;
            else if (row.delay_level === 'en avance')
              acc.advanceLateCount = row.count;
            else if (row.delay_level === 'spécialité')
              acc.specialityCount = row.count;
            return acc;
          },
          {
            goodLateCount: 0,
            lateCount: 0,
            advanceLateCount: 0,
            specialityCount: 0
          }
        );

        // Insérer les données dans delayStatus
        await db.insert(delayStatus).values({
          promoId,
          lateCount: countsMap.lateCount,
          goodLateCount: countsMap.goodLateCount,
          advanceLateCount: countsMap.advanceLateCount,
          specialityCount: countsMap.specialityCount,
          lastUpdate: new Date()
        });
      }
    }
  }

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
