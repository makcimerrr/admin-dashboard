import { db } from '../config';
import {
  delayStatus,
  promotions,
  studentCurrentProjects,
  studentProjects,
  students,
  studentSpecialtyProgress
} from '../schema';
import { and, asc, count, desc, eq, ilike, or, sql, SQL } from 'drizzle-orm';
import { SelectStudent } from '@/lib/db/schema/students';

export async function getStudents(
  search: string,
  offset: number,
  promo: string,
  filter: string,
  direction: string,
  status: string | null,
  delayLevel: string | null,
  track: string | null = null,
  trackCompleted: string | null = null
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

  // Filtre par tronc
  let trackFilter: SQL<unknown> | null = null;
  if (track && trackCompleted) {
    const isCompleted = trackCompleted === 'true';
    switch (track.toLowerCase()) {
      case 'golang':
        trackFilter = eq(studentSpecialtyProgress.golang_completed, isCompleted);
        break;
      case 'javascript':
        trackFilter = eq(studentSpecialtyProgress.javascript_completed, isCompleted);
        break;
      case 'rust':
        trackFilter = eq(studentSpecialtyProgress.rust_completed, isCompleted);
        break;
      case 'java':
        trackFilter = eq(studentSpecialtyProgress.java_completed, isCompleted);
        break;
    }
  }

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

  // Combinaison des filtres (promo, recherche, status, delay_level, track)
  const filters = [
    promoFilter,
    searchFilter,
    statusFilter,
    delayLevelFilter,
    trackFilter
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
    'availableAt',
    'actual_project_name',
    'golang_project',
    'javascript_project',
    'rust_project',
    'java_project',
    'golang_completed',
    'javascript_completed',
    'rust_completed',
    'java_completed'
  ];
  const orderByColumn = allowedFilters.includes(filter) ? filter : null;

  // Colonnes des projets à trier en ignorant les emojis
  const projectColumns = [
    'golang_project',
    'javascript_project',
    'rust_project',
    'java_project'
  ];

  // Requête pour récupérer les étudiants avec les filtres et la jointure
  const studentsQuery = db
    .select({
      id: students.id,
      last_name: students.last_name,
      first_name: students.first_name,
      login: students.login,
      promos: students.promoName,
      availableAt: students.availableAt,
      actual_project_name: studentProjects.project_name,
      progress_status: studentProjects.progress_status,
      delay_level: studentProjects.delay_level,
      golang_project: studentCurrentProjects.golang_project,
      golang_project_status: studentCurrentProjects.golang_project_status,
      javascript_project: studentCurrentProjects.javascript_project,
      javascript_project_status: studentCurrentProjects.javascript_project_status,
      rust_project: studentCurrentProjects.rust_project,
      rust_project_status: studentCurrentProjects.rust_project_status,
      java_project: studentCurrentProjects.java_project,
      java_project_status: studentCurrentProjects.java_project_status,
      golang_completed: studentSpecialtyProgress.golang_completed,
      javascript_completed: studentSpecialtyProgress.javascript_completed,
      rust_completed: studentSpecialtyProgress.rust_completed,
      java_completed: studentSpecialtyProgress.java_completed
    })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
    .leftJoin(
      studentCurrentProjects,
      eq(students.id, studentCurrentProjects.student_id)
    )
    .leftJoin(
      studentSpecialtyProgress,
      eq(students.id, studentSpecialtyProgress.student_id)
    );

  // Appliquer les filtres sur la liste des étudiants
  if (finalFilter) {
    studentsQuery.where(finalFilter);
  }

  // Appliquer le tri insensible à la casse pour les colonnes textuelles, sinon tri classique
  if (orderByColumn) {
    // Assure-toi que les clés 'golang_project', 'javascript_project' et 'rust_project' sont bien présentes dans columnMap
    const columnMap = {
      last_name: students.last_name,
      first_name: students.first_name,
      login: students.login,
      promos: students.promoName,
      availableAt: students.availableAt,
      actual_project_name: studentProjects.project_name,
      project_name: studentProjects.project_name,
      progress_status: studentProjects.progress_status,
      delay_level: studentProjects.delay_level,
      golang_project: studentCurrentProjects.golang_project,
      javascript_project: studentCurrentProjects.javascript_project,
      rust_project: studentCurrentProjects.rust_project,
      java_project: studentCurrentProjects.java_project,
      golang_completed: studentSpecialtyProgress.golang_completed,
      javascript_completed: studentSpecialtyProgress.javascript_completed,
      rust_completed: studentSpecialtyProgress.rust_completed,
      java_completed: studentSpecialtyProgress.java_completed
    };

    const columnToOrder = columnMap[orderByColumn as keyof typeof columnMap];

    if (columnToOrder) {
      // Colonnes à trier en nettoyant les caractères non alphanumériques ni espaces (par exemple, les emojis)
      if (projectColumns.includes(orderByColumn)) {
        // Utiliser regexp_replace pour supprimer tous les caractères non alphanumériques ni espaces
        const cleanText = sql`regexp_replace
                    (${columnToOrder}::text, '[^a-zA-Z0-9 ]', '', 'g')`;
        const orderSql =
          direction === 'desc'
            ? sql`LOWER
                                (${cleanText})
                                DESC NULLS LAST`
            : sql`LOWER
                                (${cleanText})
                                ASC NULLS FIRST`;
        studentsQuery.orderBy(orderSql);
        console.log('SQL ORDER appliqué');
      } else {
        // Appliquer LOWER() uniquement sur les colonnes textuelles
        const textColumns = [
          'last_name',
          'first_name',
          'login',
          'promos',
          'actual_project_name',
          'project_name',
          'progress_status',
          'delay_level'
        ];
        if (textColumns.includes(orderByColumn)) {
          const orderSql =
            direction === 'desc'
              ? sql`LOWER
                                    (${columnToOrder})
                                    DESC NULLS LAST`
              : sql`LOWER
                                    (${columnToOrder})
                                    ASC NULLS FIRST`;
          studentsQuery.orderBy(orderSql);
          console.log('SQL ORDER appliqué');
        } else {
          studentsQuery.orderBy(
            direction === 'desc' ? desc(columnToOrder) : asc(columnToOrder)
          );
          console.log('SQL ORDER appliqué');
        }
      }
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
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
    .leftJoin(
      studentSpecialtyProgress,
      eq(students.id, studentSpecialtyProgress.student_id)
    );

  // Ajouter le même filtre que pour la récupération des étudiants
  if (finalFilter) {
    totalQuery.where(finalFilter);
  }

  const totalStudents = (await totalQuery)[0].count;

  // Calculer les nouveaux offsets pour la pagination
  const newOffset =
    studentsResult.length >= studentsPerPage ? offset + studentsPerPage : null;
  const previousOffset =
    offset >= studentsPerPage ? offset - studentsPerPage : null;

  // Mise à jour ou insertion dans delay_status pour chaque promo si promo est vide
  // NOTE: This part seems to be doing heavy lifting on every request. 
  // Consider moving this to a background job or caching it if performance is an issue.
  // For now, we keep it as is but optimize the queries inside if possible.
  
  if (!promo) {
    // Récupérer toutes les promotions
    const allPromos = await db.select().from(promotions);

    // Use Promise.all to run updates in parallel
    await Promise.all(allPromos.map(async (promo) => {
      const promoId = promo.promoId;
      const promoFilter = eq(students.promoName, promo.name);

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
          else if (row.delay_level === 'Validé')
            acc.validatedCount = row.count;
          else if (row.delay_level === 'Non Validé')
            acc.notValidatedCount = row.count;
          return acc;
        },
        {
          goodLateCount: 0,
          lateCount: 0,
          advanceLateCount: 0,
          specialityCount: 0,
          validatedCount: 0,
          notValidatedCount: 0
        }
      );

      // Insérer ou mettre à jour les données dans delayStatus
      // Check if entry exists first to decide between insert or update if needed, 
      // or just insert since there is no unique constraint on promoId in the schema shown (it has a serial id)
      // However, usually we want one entry per promo. The schema shows 'id' as PK.
      // Assuming we want to keep history or just update the latest. 
      // The original code was doing insert. Let's stick to insert for now but be aware it might fill up the table.
      
      // Optimization: If we only need the latest status, we should probably update or delete old ones.
      // But following the original logic:
      await db.insert(delayStatus).values({
        promoId,
        lateCount: countsMap.lateCount,
        goodLateCount: countsMap.goodLateCount,
        advanceLateCount: countsMap.advanceLateCount,
        specialityCount: countsMap.specialityCount,
        validatedCount: countsMap.validatedCount,
        notValidatedCount: countsMap.notValidatedCount,
        lastUpdate: new Date()
      });
    }));
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
          else if (row.delay_level === 'Validé')
            acc.validatedCount = row.count;
          else if (row.delay_level === 'Non Validé')
            acc.notValidatedCount = row.count;
          return acc;
        },
        {
          goodLateCount: 0,
          lateCount: 0,
          advanceLateCount: 0,
          specialityCount: 0,
          validatedCount: 0,
          notValidatedCount: 0
        }
      );

      // Insérer les données dans delayStatus
      await db.insert(delayStatus).values({
        promoId,
        lateCount: countsMap.lateCount,
        goodLateCount: countsMap.goodLateCount,
        advanceLateCount: countsMap.advanceLateCount,
        specialityCount: countsMap.specialityCount,
        validatedCount: countsMap.validatedCount,
        notValidatedCount: countsMap.notValidatedCount,
        lastUpdate: new Date()
      });
    }
  }

  return {
    students: studentsResult,
    currentOffset: offset,
    newOffset,
    previousOffset,
    totalStudents: totalStudents
  };
}

export async function createStudent(
  login: string,
  last_name: string,
  first_name: string,
  promoName: string
): Promise<number> {
  const result = await db
    .insert(students)
    .values({
      login,
      last_name,
      first_name,
      promoName,
      availableAt: new Date()
    })
    .returning({ id: students.id });

  return result[0].id;
}

export async function updateStudentProject(
  login: string,
  project_name: string,
  project_status: string,
  delay_level: string,
  last_projects_finished: { [key: string]: boolean },
  common_projects: { [key: string]: { name: string | null, status: string | null } },
  promo_name: string
) {
  // Récupérer l'ID de l'étudiant depuis son login
  const student = await db
    .select({ id: students.id, promoName: students.promoName })
    .from(students)
    .where(eq(students.login, login))
    .limit(1);

  let studentId: number;

  if (!student || student.length === 0) {
    // Récupérer les informations de l'étudiant depuis l'API
    try {
      console.log(
        `Tentative de récupération des données pour l'étudiant ${login}`
      );
      const response = await fetch(
        `https://api-zone01-rouen.deno.dev/api/v1/user-info/${login}`
      );
      if (!response.ok) {
        throw new Error(
          `Erreur lors de la récupération des données de l'étudiant ${login}`
        );
      }
      const userData = await response.json();
      console.log('Données récupérées:', userData);

      // Créer l'étudiant avec les données récupérées
      const user = Array.isArray(userData.user)
        ? userData.user[0]
        : userData.user;
      studentId = await createStudent(
        login,
        user?.lastName || 'Nom',
        user?.firstName || 'Prénom',
        promo_name
      );
      console.log(`Étudiant créé avec l'ID ${studentId}`);
    } catch (error) {
      console.error(
        `Erreur lors de la récupération des données de l'étudiant ${login}:`,
        error
      );
      // En cas d'erreur, créer l'étudiant avec les données minimales
      studentId = await createStudent(login, 'Nom', 'Prénom', promo_name);
    }
  } else {
    studentId = student[0].id;

    // Mettre à jour la promotion de l'étudiant si nécessaire
    if (student[0].promoName !== promo_name) {
      await db
        .update(students)
        .set({ promoName: promo_name })
        .where(eq(students.id, studentId));
    }
  }

  // Mise à jour des projets dans la table studentProjects
  await db
    .insert(studentProjects)
    .values({
      student_id: studentId,
      project_name,
      progress_status: project_status,
      delay_level: delay_level
    })
    .onConflictDoUpdate({
      target: [studentProjects.student_id],
      set: {
        project_name,
        progress_status: project_status,
        delay_level
      }
    });

  await db
    .insert(studentCurrentProjects)
    .values({
      student_id: studentId,
      golang_project: common_projects['Golang']?.name || null,
      golang_project_status: common_projects['Golang']?.status || null,
      javascript_project: common_projects['Javascript']?.name || null,
      javascript_project_status: common_projects['Javascript']?.status || null,
      rust_project: common_projects['Rust']?.name || null,
      rust_project_status: common_projects['Rust']?.status || null,
      java_project: common_projects['Java']?.name || null,
      java_project_status: common_projects['Java']?.status || null
    })
    .onConflictDoUpdate({
      target: studentCurrentProjects.student_id,
      set: {
        golang_project: common_projects['Golang']?.name || null,
        golang_project_status: common_projects['Golang']?.status || null,
        javascript_project: common_projects['Javascript']?.name || null,
        javascript_project_status: common_projects['Javascript']?.status || null,
        rust_project: common_projects['Rust']?.name || null,
        rust_project_status: common_projects['Rust']?.status || null,
        java_project: common_projects['Java']?.name || null,
        java_project_status: common_projects['Java']?.status || null
      }
    });

  await db
    .insert(studentSpecialtyProgress)
    .values({
      student_id: studentId,
      golang_completed: last_projects_finished['Golang'] ?? false,
      javascript_completed: last_projects_finished['Javascript'] ?? false,
      rust_completed: last_projects_finished['Rust'] ?? false,
      java_completed: last_projects_finished['Java'] ?? false
    })
    .onConflictDoUpdate({
      target: studentSpecialtyProgress.student_id,
      set: {
        golang_completed: last_projects_finished['Golang'] ?? false,
        javascript_completed: last_projects_finished['Javascript'] ?? false,
        rust_completed: last_projects_finished['Rust'] ?? false,
        java_completed: last_projects_finished['Java'] ?? false
      }
    });

  console.log(`Student ${login} data has been updated.`);
}

export async function getProjectProgressStats(
  promoName: string,
  expectedProject: string | { rust?: string; java?: string }
): Promise<{
  totalStudents: number;
  onExpectedProject: number;
  percentage: number;
  offProjectStats: {
    ahead: number;
    late: number;
    specialty: number;
    validated: number;
    notValidated: number;
    other: number;
  };
  rustStats?: { total: number; onProject: number };
  javaStats?: { total: number; onProject: number };
}> {
  try {
    // Compter le nombre total d'étudiants dans la promo
    const totalResult = await db
      .select({ count: count() })
      .from(students)
      .where(eq(students.promoName, promoName))
      .execute();

    const totalStudents = totalResult[0]?.count || 0;

    if (typeof expectedProject === 'string') {
      // Projet simple
      const onProjectResult = await db
        .select({ count: count() })
        .from(students)
        .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
        .where(
          and(
            eq(students.promoName, promoName),
            sql`LOWER(${studentProjects.project_name}) = LOWER(${expectedProject})`
          )
        )
        .execute();

      const onExpectedProject = onProjectResult[0]?.count || 0;
      const percentage = totalStudents > 0 ? Math.round((onExpectedProject / totalStudents) * 100) : 0;

      // Compter les étudiants qui ne sont PAS sur le projet attendu, groupés par delay_level
      const offProjectResult = await db
        .select({
          delay_level: studentProjects.delay_level,
          count: count()
        })
        .from(students)
        .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
        .where(
          and(
            eq(students.promoName, promoName),
            sql`LOWER(${studentProjects.project_name}) != LOWER(${expectedProject})`
          )
        )
        .groupBy(studentProjects.delay_level)
        .execute();

      const offProjectStats = {
        ahead: 0,
        late: 0,
        specialty: 0,
        validated: 0,
        notValidated: 0,
        other: 0
      };

      offProjectResult.forEach((row) => {
        const delayLevel = row.delay_level?.toLowerCase();
        const count = row.count || 0;

        if (delayLevel === 'en avance') offProjectStats.ahead += count;
        else if (delayLevel === 'en retard') offProjectStats.late += count;
        else if (delayLevel === 'spécialité') offProjectStats.specialty += count;
        else if (delayLevel === 'validé') offProjectStats.validated += count;
        else if (delayLevel === 'non validé') offProjectStats.notValidated += count;
        else offProjectStats.other += count;
      });

      return {
        totalStudents,
        onExpectedProject,
        percentage,
        offProjectStats
      };
    } else {
      // Multi-track (rust/java)
      const rustProject = expectedProject.rust;
      const javaProject = expectedProject.java;

      let rustOnProject = 0;
      let javaOnProject = 0;
      let totalOnExpected = 0;

      if (rustProject) {
        const rustResult = await db
          .select({ count: count() })
          .from(students)
          .leftJoin(studentCurrentProjects, eq(students.id, studentCurrentProjects.student_id))
          .where(
            and(
              eq(students.promoName, promoName),
              sql`LOWER(${studentCurrentProjects.rust_project}) = LOWER(${rustProject})`
            )
          )
          .execute();
        rustOnProject = rustResult[0]?.count || 0;
        totalOnExpected += rustOnProject;
      }

      if (javaProject) {
        const javaResult = await db
          .select({ count: count() })
          .from(students)
          .leftJoin(studentCurrentProjects, eq(students.id, studentCurrentProjects.student_id))
          .where(
            and(
              eq(students.promoName, promoName),
              sql`LOWER(${studentCurrentProjects.java_project}) = LOWER(${javaProject})`
            )
          )
          .execute();
        javaOnProject = javaResult[0]?.count || 0;
        totalOnExpected += javaOnProject;
      }

      const percentage = totalStudents > 0 ? Math.round((totalOnExpected / totalStudents) * 100) : 0;

      // Compter les étudiants qui ne sont sur AUCUN des projets attendus, groupés par delay_level
      const offProjectResult = await db
        .select({
          delay_level: studentProjects.delay_level,
          count: count()
        })
        .from(students)
        .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
        .leftJoin(studentCurrentProjects, eq(students.id, studentCurrentProjects.student_id))
        .where(
          and(
            eq(students.promoName, promoName),
            rustProject && javaProject
              ? and(
                  sql`LOWER(${studentCurrentProjects.rust_project}) != LOWER(${rustProject})`,
                  sql`LOWER(${studentCurrentProjects.java_project}) != LOWER(${javaProject})`
                )
              : rustProject
              ? sql`LOWER(${studentCurrentProjects.rust_project}) != LOWER(${rustProject})`
              : sql`LOWER(${studentCurrentProjects.java_project}) != LOWER(${javaProject})`
          )
        )
        .groupBy(studentProjects.delay_level)
        .execute();

      const offProjectStats = {
        ahead: 0,
        late: 0,
        specialty: 0,
        validated: 0,
        notValidated: 0,
        other: 0
      };

      offProjectResult.forEach((row) => {
        const delayLevel = row.delay_level?.toLowerCase();
        const count = row.count || 0;

        if (delayLevel === 'en avance') offProjectStats.ahead += count;
        else if (delayLevel === 'en retard') offProjectStats.late += count;
        else if (delayLevel === 'spécialité') offProjectStats.specialty += count;
        else if (delayLevel === 'validé') offProjectStats.validated += count;
        else if (delayLevel === 'non validé') offProjectStats.notValidated += count;
        else offProjectStats.other += count;
      });

      return {
        totalStudents,
        onExpectedProject: totalOnExpected,
        percentage,
        offProjectStats,
        rustStats: rustProject ? { total: totalStudents, onProject: rustOnProject } : undefined,
        javaStats: javaProject ? { total: totalStudents, onProject: javaOnProject } : undefined
      };
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques de progression:', error);
    return {
      totalStudents: 0,
      onExpectedProject: 0,
      percentage: 0,
      offProjectStats: {
        ahead: 0,
        late: 0,
        specialty: 0,
        validated: 0,
        notValidated: 0,
        other: 0
      }
    };
  }
}

export async function deleteStudentById(id: number) {
  console.log("Suppression de l'étudiant avec l'ID:", id);
  // await db.delete(students).where(eq(students.id, id));
}
