// Tools AI pour l'assistant Nova (version compatible ai v3.4)
// Ces fonctions sont appelées par l'IA pour interroger la base de données

import { z } from 'zod';
import { db } from '@/lib/db/config';
import { students, studentProjects, studentCurrentProjects, studentSpecialtyProgress } from '@/lib/db/schema';
import { eq, ilike, or, and, count, sql } from 'drizzle-orm';

// Définition des schémas Zod pour les outils
export const searchStudentsSchema = z.object({
  query: z.string().describe('Le terme de recherche (nom, prénom, login)'),
  limit: z.number().optional().default(10).describe('Nombre max de résultats'),
});

export const getStudentDetailsSchema = z.object({
  studentId: z.number().describe("L'ID de l'étudiant"),
});

export const listStudentsByStatusSchema = z.object({
  status: z.enum(['late', 'validated', 'good', 'specialty', 'all']).describe('Le statut à filtrer'),
  limit: z.number().optional().default(20).describe('Nombre max de résultats'),
});

export const listStudentsByPromoSchema = z.object({
  promoName: z.string().optional().describe('Nom de la promo (si vide, liste toutes les promos)'),
  limit: z.number().optional().default(30).describe('Nombre max de résultats'),
});

export const listStudentsBySpecialtySchema = z.object({
  specialty: z.enum(['golang', 'javascript', 'rust', 'java']).describe('La spécialité'),
  limit: z.number().optional().default(25).describe('Nombre max de résultats'),
});

export const compareStudentsSchema = z.object({
  studentIds: z.array(z.number()).min(2).max(5).describe('Les IDs des étudiants à comparer'),
});

export const customQuerySchema = z.object({
  queryType: z.enum([
    'top_performers',
    'promo_comparison',
    'track_distribution',
  ]).describe('Type de requête'),
  limit: z.number().optional().default(10),
});

// Fonctions d'exécution des outils

export async function searchStudents({ query, limit = 10 }: z.infer<typeof searchStudentsSchema>) {
  const searchPattern = `%${query}%`;

  const results = await db
    .select({
      id: students.id,
      firstName: students.first_name,
      lastName: students.last_name,
      login: students.login,
      promoName: students.promoName,
      delayLevel: studentProjects.delay_level,
      projectName: studentProjects.project_name,
    })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
    .where(
      or(
        ilike(students.first_name, searchPattern),
        ilike(students.last_name, searchPattern),
        ilike(students.login, searchPattern)
      )
    )
    .limit(limit)
    .execute();

  const unique = Array.from(new Map(results.map(r => [r.id, r])).values());

  return {
    count: unique.length,
    students: unique.map(s => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      login: s.login,
      promo: s.promoName,
      status: s.delayLevel || 'Non défini',
      currentProject: s.projectName || 'Aucun',
    })),
  };
}

export async function getStudentDetails({ studentId }: z.infer<typeof getStudentDetailsSchema>) {
  const result = await db
    .select({
      id: students.id,
      firstName: students.first_name,
      lastName: students.last_name,
      login: students.login,
      promoName: students.promoName,
      delayLevel: studentProjects.delay_level,
      projectName: studentProjects.project_name,
      golangProject: studentCurrentProjects.golang_project,
      golangCompleted: studentSpecialtyProgress.golang_completed,
      javascriptProject: studentCurrentProjects.javascript_project,
      javascriptCompleted: studentSpecialtyProgress.javascript_completed,
      rustProject: studentCurrentProjects.rust_project,
      rustCompleted: studentSpecialtyProgress.rust_completed,
      javaProject: studentCurrentProjects.java_project,
      javaCompleted: studentSpecialtyProgress.java_completed,
    })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
    .leftJoin(studentCurrentProjects, eq(students.id, studentCurrentProjects.student_id))
    .leftJoin(studentSpecialtyProgress, eq(students.id, studentSpecialtyProgress.student_id))
    .where(eq(students.id, studentId))
    .execute();

  if (result.length === 0) {
    return { found: false, message: `Aucun étudiant trouvé avec l'ID ${studentId}` };
  }

  const s = result[0];
  const tracks = [
    { name: 'Golang', project: s.golangProject, completed: s.golangCompleted },
    { name: 'JavaScript', project: s.javascriptProject, completed: s.javascriptCompleted },
    { name: 'Rust', project: s.rustProject, completed: s.rustCompleted },
    { name: 'Java', project: s.javaProject, completed: s.javaCompleted },
  ].filter(t => t.project || t.completed);

  return {
    found: true,
    student: {
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      login: s.login,
      promo: s.promoName,
      status: s.delayLevel || 'Non défini',
      currentProject: s.projectName || 'Aucun',
      tracks: tracks.map(t => ({
        name: t.name,
        currentProject: t.project || 'Non commencé',
        completed: t.completed || false,
      })),
      completedTracks: tracks.filter(t => t.completed).length,
      totalTracks: tracks.length || 3,
    },
  };
}

export async function getStats() {
  const totalResult = await db.select({ count: count() }).from(students).execute();
  const total = totalResult[0]?.count || 0;

  const statusCounts = await Promise.all([
    db.select({ count: sql<number>`count(DISTINCT ${students.id})` })
      .from(students)
      .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
      .where(sql`${studentProjects.delay_level} = 'en retard'`)
      .execute(),
    db.select({ count: sql<number>`count(DISTINCT ${students.id})` })
      .from(students)
      .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
      .where(sql`${studentProjects.delay_level} = 'Validé'`)
      .execute(),
    db.select({ count: sql<number>`count(DISTINCT ${students.id})` })
      .from(students)
      .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
      .where(or(
        sql`${studentProjects.delay_level} = 'bien'`,
        sql`${studentProjects.delay_level} = 'en avance'`
      ))
      .execute(),
  ]);

  const late = Number(statusCounts[0][0]?.count) || 0;
  const validated = Number(statusCounts[1][0]?.count) || 0;
  const goodProgress = Number(statusCounts[2][0]?.count) || 0;

  const promosResult = await db
    .select({ promoName: students.promoName })
    .from(students)
    .groupBy(students.promoName)
    .execute();

  return {
    totalStudents: total,
    totalPromos: promosResult.length,
    validated,
    validatedPercent: total > 0 ? Math.round((validated / total) * 100) : 0,
    goodProgress,
    late,
    latePercent: total > 0 ? Math.round((late / total) * 100) : 0,
  };
}

export async function listStudentsByStatus({ status, limit = 20 }: z.infer<typeof listStudentsByStatusSchema>) {
  const statusMap: Record<string, string | string[]> = {
    late: 'en retard',
    validated: 'Validé',
    good: ['bien', 'en avance'],
    specialty: 'spécialité',
  };

  let whereClause;
  if (status !== 'all') {
    const statusValue = statusMap[status];
    if (Array.isArray(statusValue)) {
      whereClause = or(...statusValue.map(v => sql`${studentProjects.delay_level} = ${v}`));
    } else {
      whereClause = sql`${studentProjects.delay_level} = ${statusValue}`;
    }
  }

  const results = await db
    .select({
      id: students.id,
      firstName: students.first_name,
      lastName: students.last_name,
      login: students.login,
      promoName: students.promoName,
      delayLevel: studentProjects.delay_level,
      projectName: studentProjects.project_name,
    })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
    .where(whereClause)
    .limit(limit * 2)
    .execute();

  const unique = Array.from(new Map(results.map(r => [r.id, r])).values()).slice(0, limit);

  const byPromo: Record<string, number> = {};
  unique.forEach(s => {
    byPromo[s.promoName] = (byPromo[s.promoName] || 0) + 1;
  });

  return {
    status,
    count: unique.length,
    byPromo,
    students: unique.map(s => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      login: s.login,
      promo: s.promoName,
      status: s.delayLevel,
      currentProject: s.projectName || 'N/A',
    })),
  };
}

export async function listStudentsByPromo({ promoName, limit = 30 }: z.infer<typeof listStudentsByPromoSchema>) {
  if (!promoName) {
    const promos = await db
      .select({
        promoName: students.promoName,
        count: count(),
      })
      .from(students)
      .groupBy(students.promoName)
      .execute();

    return {
      mode: 'list_promos',
      promos: promos.map(p => ({
        name: p.promoName,
        studentCount: p.count,
      })),
    };
  }

  const searchPattern = `%${promoName}%`;
  const results = await db
    .select({
      id: students.id,
      firstName: students.first_name,
      lastName: students.last_name,
      login: students.login,
      promoName: students.promoName,
      delayLevel: studentProjects.delay_level,
    })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
    .where(ilike(students.promoName, searchPattern))
    .limit(limit * 2)
    .execute();

  const unique = Array.from(new Map(results.map(r => [r.id, r])).values()).slice(0, limit);

  return {
    mode: 'promo_detail',
    promoName: unique[0]?.promoName || promoName,
    count: unique.length,
    stats: {
      validated: unique.filter(s => s.delayLevel === 'Validé').length,
      late: unique.filter(s => s.delayLevel === 'en retard').length,
      good: unique.filter(s => s.delayLevel === 'bien' || s.delayLevel === 'en avance').length,
    },
    students: unique.map(s => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      login: s.login,
      status: s.delayLevel || 'N/A',
    })),
  };
}

export async function listStudentsBySpecialty({ specialty, limit = 25 }: z.infer<typeof listStudentsBySpecialtySchema>) {
  const columns = {
    golang: { project: studentCurrentProjects.golang_project, completed: studentSpecialtyProgress.golang_completed },
    javascript: { project: studentCurrentProjects.javascript_project, completed: studentSpecialtyProgress.javascript_completed },
    rust: { project: studentCurrentProjects.rust_project, completed: studentSpecialtyProgress.rust_completed },
    java: { project: studentCurrentProjects.java_project, completed: studentSpecialtyProgress.java_completed },
  };

  const { project: projectCol, completed: completedCol } = columns[specialty];

  const results = await db
    .select({
      id: students.id,
      firstName: students.first_name,
      lastName: students.last_name,
      login: students.login,
      promoName: students.promoName,
      currentProject: projectCol,
      completed: completedCol,
    })
    .from(students)
    .leftJoin(studentCurrentProjects, eq(students.id, studentCurrentProjects.student_id))
    .leftJoin(studentSpecialtyProgress, eq(students.id, studentSpecialtyProgress.student_id))
    .where(sql`${projectCol} IS NOT NULL`)
    .limit(limit * 2)
    .execute();

  const unique = Array.from(new Map(results.map(r => [r.id, r])).values()).slice(0, limit);

  return {
    specialty,
    count: unique.length,
    completedCount: unique.filter(s => s.completed).length,
    inProgressCount: unique.filter(s => !s.completed).length,
    students: unique.map(s => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      login: s.login,
      promo: s.promoName,
      currentProject: s.currentProject || 'N/A',
      completed: s.completed || false,
    })),
  };
}

export async function compareStudents({ studentIds }: z.infer<typeof compareStudentsSchema>) {
  const results = await Promise.all(
    studentIds.map(async (id) => {
      const result = await db
        .select({
          id: students.id,
          firstName: students.first_name,
          lastName: students.last_name,
          login: students.login,
          promoName: students.promoName,
          delayLevel: studentProjects.delay_level,
          projectName: studentProjects.project_name,
          golangCompleted: studentSpecialtyProgress.golang_completed,
          javascriptCompleted: studentSpecialtyProgress.javascript_completed,
          rustCompleted: studentSpecialtyProgress.rust_completed,
          javaCompleted: studentSpecialtyProgress.java_completed,
        })
        .from(students)
        .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
        .leftJoin(studentSpecialtyProgress, eq(students.id, studentSpecialtyProgress.student_id))
        .where(eq(students.id, id))
        .execute();

      if (result.length === 0) return null;
      const s = result[0];

      return {
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        login: s.login,
        promo: s.promoName,
        status: s.delayLevel || 'N/A',
        currentProject: s.projectName || 'N/A',
        completedTracks: [s.golangCompleted, s.javascriptCompleted, s.rustCompleted, s.javaCompleted].filter(Boolean).length,
      };
    })
  );

  return { students: results.filter(Boolean) };
}

// Définition des outils pour l'IA
export const novaTools = {
  searchStudents: {
    description: `Recherche des étudiants par nom, prénom, login ou ID.
      Utilise cette fonction quand l'utilisateur veut trouver un étudiant spécifique.
      Exemples: "cherche Maxime", "trouve Dubois", "étudiant @mdubois", "qui est Jean Martin"`,
    parameters: searchStudentsSchema,
    execute: searchStudents,
  },
  getStudentDetails: {
    description: `Obtient les détails complets d'un étudiant par son ID.
      Utilise cette fonction quand l'utilisateur veut voir le profil complet, la progression, ou les projets d'un étudiant.
      Exemples: "détails de l'étudiant 42", "progression de #123", "profil complet"`,
    parameters: getStudentDetailsSchema,
    execute: getStudentDetails,
  },
  getStats: {
    description: `Obtient les statistiques globales de Zone01 Normandie.
      Utilise cette fonction pour les questions sur les chiffres, totaux, taux, pourcentages.
      Exemples: "combien d'étudiants", "statistiques", "taux de réussite", "résumé"`,
    parameters: z.object({}),
    execute: getStats,
  },
  listStudentsByStatus: {
    description: `Liste les étudiants selon leur statut de progression.
      Utilise cette fonction pour les questions sur les étudiants en retard, validés, en avance, etc.
      Exemples: "étudiants en retard", "qui a validé", "les meilleurs étudiants", "ceux en avance"`,
    parameters: listStudentsByStatusSchema,
    execute: listStudentsByStatus,
  },
  listStudentsByPromo: {
    description: `Liste les étudiants d'une promotion spécifique ou liste toutes les promotions.
      Utilise cette fonction pour les questions sur les promos, cohortes, groupes.
      Exemples: "promo Rouen 2024", "étudiants de la promotion X", "liste des promos"`,
    parameters: listStudentsByPromoSchema,
    execute: listStudentsByPromo,
  },
  listStudentsBySpecialty: {
    description: `Liste les étudiants par spécialité/tronc technique.
      Utilise cette fonction pour les questions sur Golang, JavaScript, Rust, Java.
      Exemples: "qui fait Golang", "étudiants en JavaScript", "spécialité Rust"`,
    parameters: listStudentsBySpecialtySchema,
    execute: listStudentsBySpecialty,
  },
  compareStudents: {
    description: `Compare deux ou plusieurs étudiants entre eux.
      Utilise cette fonction quand l'utilisateur veut comparer des étudiants.
      Exemples: "compare Maxime et Thomas", "différence entre étudiant 1 et 2"`,
    parameters: compareStudentsSchema,
    execute: compareStudents,
  },
};
