import { db } from '../config';
import { students, studentProjects, promotions, delayStatus } from '../schema';
import { count, eq, ilike, or, and, sql, desc, asc, SQL } from 'drizzle-orm';
import { SelectStudent } from '@/lib/db/schema/students';
import {studentCurrentProjects, studentSpecialtyProgress} from "@/lib/db/schema/students";

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

export async function updateStudentProject(
    login: string,
    project_name: string,
    project_status: string,
    delay_level: string,
    last_projects_finished: { [key: string]: boolean },
    common_projects: { [key: string]: string | null }
) {
    // Récupérer l'ID de l'étudiant depuis son login
    const student = await db
        .select({ id: students.id })
        .from(students)
        .where(eq(students.login, login))
        .limit(1);

    if (!student || student.length === 0) {
        throw new Error(`Student with login "${login}" not found.`);
    }

    const studentId = student[0].id;

    console.log(`Updating student ${login}:`, {
        project_name,
        project_status,
        delay_level,
        last_projects_finished,
        common_projects
    });

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
            golang_project: common_projects['Golang'] || null,
            javascript_project: common_projects['Javascript'] || null,
            rust_project: common_projects['Rust'] || null
        })
        .onConflictDoUpdate({
            target: studentCurrentProjects.student_id, // Utilisation de la contrainte UNIQUE
            set: {
                golang_project: common_projects['Golang'] || null,
                javascript_project: common_projects['Javascript'] || null,
                rust_project: common_projects['Rust'] || null
            }
        });

    await db
        .insert(studentSpecialtyProgress)
        .values({
            student_id: studentId,
            golang_completed: last_projects_finished['Golang'] ?? false,
            javascript_completed: last_projects_finished['Javascript'] ?? false,
            rust_completed: last_projects_finished['Rust'] ?? false
        })
        .onConflictDoUpdate({
            target: studentSpecialtyProgress.student_id,
            set: {
                golang_completed: last_projects_finished['Golang'] ?? false,
                javascript_completed: last_projects_finished['Javascript'] ?? false,
                rust_completed: last_projects_finished['Rust'] ?? false
            }
        });

    console.log(`Student ${login} data has been updated.`);
}

export async function deleteStudentById(id: number) {
    console.log("Suppression de l'étudiant avec l'ID:", id);
    // await db.delete(students).where(eq(students.id, id));
}