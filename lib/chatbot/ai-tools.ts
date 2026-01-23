import { z } from 'zod';
import { db } from '@/lib/db/config';
import {
  students,
  studentProjects,
  studentCurrentProjects,
  studentSpecialtyProgress
} from '@/lib/db/schema/students';
import { promotions } from '@/lib/db/schema/promotions';
import { eq, ilike, or, and, count, sql } from 'drizzle-orm';

// =============================================================================
// SCHEMAS DE VALIDATION
// =============================================================================

const searchStudentsSchema = z.object({
  query: z.string().describe('Nom, prénom, login ou partie du nom à rechercher'),
  limit: z.number().optional().default(10).describe('Nombre max de résultats (défaut: 10)')
});

const getStudentByIdSchema = z.object({
  studentId: z.number().describe("L'ID numérique de l'étudiant")
});

const getStudentByNameSchema = z.object({
  firstName: z.string().optional().describe("Prénom de l'étudiant"),
  lastName: z.string().optional().describe("Nom de famille de l'étudiant"),
  fullName: z.string().optional().describe("Nom complet (prénom + nom ou nom + prénom)")
});

const listStudentsByStatusSchema = z.object({
  status: z.enum(['en retard', 'bien', 'en avance', 'Validé', 'Non Validé', 'spécialité'])
    .describe("Statut de progression: 'en retard', 'bien', 'en avance', 'Validé', 'Non Validé', 'spécialité'"),
  promoName: z.string().optional().describe('Filtrer par nom de promotion'),
  limit: z.number().optional().default(20).describe('Nombre max de résultats')
});

const listStudentsByPromoSchema = z.object({
  promoName: z.string().describe('Nom de la promotion'),
  limit: z.number().optional().default(50).describe('Nombre max de résultats')
});

const listStudentsByProjectSchema = z.object({
  projectName: z.string().describe('Nom du projet (partiel ou complet)'),
  track: z.enum(['golang', 'javascript', 'rust', 'java', 'all']).optional().default('all')
    .describe('Filière spécifique ou toutes'),
  limit: z.number().optional().default(20).describe('Nombre max de résultats')
});

const getStatsSchema = z.object({
  promoName: z.string().optional().describe('Nom de la promotion (vide = stats globales)')
});

const getTrackStatsSchema = z.object({
  track: z.enum(['golang', 'javascript', 'rust', 'java']).describe('La filière à analyser'),
  promoName: z.string().optional().describe('Filtrer par promotion')
});

const compareStudentsSchema = z.object({
  studentIds: z.array(z.number()).min(2).max(5).describe('Liste des IDs des étudiants à comparer (2-5)')
});

const listAllPromosSchema = z.object({});

const checkStudentProgressSchema = z.object({
  firstName: z.string().optional().describe("Prénom de l'étudiant"),
  lastName: z.string().optional().describe("Nom de famille de l'étudiant"),
  fullName: z.string().optional().describe("Nom complet"),
  studentId: z.number().optional().describe("Ou l'ID de l'étudiant")
});

const listStudentsAheadSchema = z.object({
  promoName: z.string().optional().describe('Filtrer par promotion'),
  limit: z.number().optional().default(20).describe('Nombre max de résultats')
});

const listStudentsBehindSchema = z.object({
  promoName: z.string().optional().describe('Filtrer par promotion'),
  limit: z.number().optional().default(20).describe('Nombre max de résultats')
});

const getStudentsByTrackCompletionSchema = z.object({
  track: z.enum(['golang', 'javascript', 'rust', 'java']).describe('La filière'),
  completed: z.boolean().describe('true = terminé, false = non terminé'),
  promoName: z.string().optional().describe('Filtrer par promotion'),
  limit: z.number().optional().default(30).describe('Nombre max de résultats')
});

// =============================================================================
// FONCTIONS D'EXÉCUTION DES OUTILS
// =============================================================================

async function searchStudents({ query, limit }: z.infer<typeof searchStudentsSchema>) {
  const searchPattern = `%${query}%`;

  const results = await db
    .select({
      id: students.id,
      firstName: students.first_name,
      lastName: students.last_name,
      login: students.login,
      promoName: students.promoName,
      projectName: studentProjects.project_name,
      progressStatus: studentProjects.progress_status,
      delayLevel: studentProjects.delay_level
    })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
    .where(
      or(
        ilike(students.first_name, searchPattern),
        ilike(students.last_name, searchPattern),
        ilike(students.login, searchPattern),
        sql`CONCAT(${students.first_name}, ' ', ${students.last_name}) ILIKE ${searchPattern}`,
        sql`CONCAT(${students.last_name}, ' ', ${students.first_name}) ILIKE ${searchPattern}`
      )
    )
    .limit(limit);

  if (results.length === 0) {
    return { found: false, message: `Aucun étudiant trouvé pour "${query}"`, students: [] };
  }

  return {
    found: true,
    count: results.length,
    students: results.map(s => ({
      id: s.id,
      nom: `${s.firstName} ${s.lastName}`,
      login: s.login,
      promo: s.promoName,
      projetActuel: s.projectName || 'Non défini',
      statut: s.progressStatus || 'Non défini',
      niveau: s.delayLevel || 'Non défini'
    }))
  };
}

async function getStudentById({ studentId }: z.infer<typeof getStudentByIdSchema>) {
  const result = await db
    .select({
      id: students.id,
      firstName: students.first_name,
      lastName: students.last_name,
      login: students.login,
      promoName: students.promoName,
      availableAt: students.availableAt,
      projectName: studentProjects.project_name,
      progressStatus: studentProjects.progress_status,
      delayLevel: studentProjects.delay_level,
      golangProject: studentCurrentProjects.golang_project,
      golangStatus: studentCurrentProjects.golang_project_status,
      javascriptProject: studentCurrentProjects.javascript_project,
      javascriptStatus: studentCurrentProjects.javascript_project_status,
      rustProject: studentCurrentProjects.rust_project,
      rustStatus: studentCurrentProjects.rust_project_status,
      javaProject: studentCurrentProjects.java_project,
      javaStatus: studentCurrentProjects.java_project_status,
      golangCompleted: studentSpecialtyProgress.golang_completed,
      javascriptCompleted: studentSpecialtyProgress.javascript_completed,
      rustCompleted: studentSpecialtyProgress.rust_completed,
      javaCompleted: studentSpecialtyProgress.java_completed
    })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
    .leftJoin(studentCurrentProjects, eq(students.id, studentCurrentProjects.student_id))
    .leftJoin(studentSpecialtyProgress, eq(students.id, studentSpecialtyProgress.student_id))
    .where(eq(students.id, studentId))
    .limit(1);

  if (result.length === 0) {
    return { found: false, message: `Aucun étudiant avec l'ID ${studentId}` };
  }

  const s = result[0];
  return {
    found: true,
    student: {
      id: s.id,
      nom: `${s.firstName} ${s.lastName}`,
      prenom: s.firstName,
      nomFamille: s.lastName,
      login: s.login,
      promo: s.promoName,
      disponibleLe: s.availableAt,
      projetActuel: s.projectName || 'Non défini',
      statutProgression: s.progressStatus || 'Non défini',
      niveauRetard: s.delayLevel || 'Non défini',
      projetsParFiliere: {
        golang: { projet: s.golangProject, statut: s.golangStatus, termine: s.golangCompleted },
        javascript: { projet: s.javascriptProject, statut: s.javascriptStatus, termine: s.javascriptCompleted },
        rust: { projet: s.rustProject, statut: s.rustStatus, termine: s.rustCompleted },
        java: { projet: s.javaProject, statut: s.javaStatus, termine: s.javaCompleted }
      }
    }
  };
}

async function getStudentByName({ firstName, lastName, fullName }: z.infer<typeof getStudentByNameSchema>) {
  let whereClause;

  if (fullName) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      const firstPart = parts[0];
      const lastPart = parts.slice(1).join(' ');
      whereClause = or(
        and(ilike(students.first_name, `%${firstPart}%`), ilike(students.last_name, `%${lastPart}%`)),
        and(ilike(students.first_name, `%${lastPart}%`), ilike(students.last_name, `%${firstPart}%`))
      );
    } else {
      whereClause = or(
        ilike(students.first_name, `%${fullName}%`),
        ilike(students.last_name, `%${fullName}%`)
      );
    }
  } else if (firstName && lastName) {
    whereClause = and(
      ilike(students.first_name, `%${firstName}%`),
      ilike(students.last_name, `%${lastName}%`)
    );
  } else if (firstName) {
    whereClause = ilike(students.first_name, `%${firstName}%`);
  } else if (lastName) {
    whereClause = ilike(students.last_name, `%${lastName}%`);
  } else {
    return { found: false, message: 'Veuillez fournir au moins un nom, prénom ou nom complet' };
  }

  const results = await db
    .select({
      id: students.id,
      firstName: students.first_name,
      lastName: students.last_name,
      login: students.login,
      promoName: students.promoName,
      availableAt: students.availableAt,
      projectName: studentProjects.project_name,
      progressStatus: studentProjects.progress_status,
      delayLevel: studentProjects.delay_level,
      golangProject: studentCurrentProjects.golang_project,
      golangStatus: studentCurrentProjects.golang_project_status,
      javascriptProject: studentCurrentProjects.javascript_project,
      javascriptStatus: studentCurrentProjects.javascript_project_status,
      rustProject: studentCurrentProjects.rust_project,
      rustStatus: studentCurrentProjects.rust_project_status,
      javaProject: studentCurrentProjects.java_project,
      javaStatus: studentCurrentProjects.java_project_status,
      golangCompleted: studentSpecialtyProgress.golang_completed,
      javascriptCompleted: studentSpecialtyProgress.javascript_completed,
      rustCompleted: studentSpecialtyProgress.rust_completed,
      javaCompleted: studentSpecialtyProgress.java_completed
    })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
    .leftJoin(studentCurrentProjects, eq(students.id, studentCurrentProjects.student_id))
    .leftJoin(studentSpecialtyProgress, eq(students.id, studentSpecialtyProgress.student_id))
    .where(whereClause)
    .limit(5);

  if (results.length === 0) {
    const searchTerm = fullName || `${firstName || ''} ${lastName || ''}`.trim();
    return { found: false, message: `Aucun étudiant trouvé pour "${searchTerm}"` };
  }

  return {
    found: true,
    count: results.length,
    students: results.map(s => ({
      id: s.id,
      nom: `${s.firstName} ${s.lastName}`,
      prenom: s.firstName,
      nomFamille: s.lastName,
      login: s.login,
      promo: s.promoName,
      disponibleLe: s.availableAt,
      projetActuel: s.projectName || 'Non défini',
      statutProgression: s.progressStatus || 'Non défini',
      niveauRetard: s.delayLevel || 'Non défini',
      projetsParFiliere: {
        golang: { projet: s.golangProject, statut: s.golangStatus, termine: s.golangCompleted },
        javascript: { projet: s.javascriptProject, statut: s.javascriptStatus, termine: s.javascriptCompleted },
        rust: { projet: s.rustProject, statut: s.rustStatus, termine: s.rustCompleted },
        java: { projet: s.javaProject, statut: s.javaStatus, termine: s.javaCompleted }
      }
    }))
  };
}

async function checkStudentProgress({ firstName, lastName, fullName, studentId }: z.infer<typeof checkStudentProgressSchema>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let studentData: any = null;

  if (studentId) {
    const result = await getStudentById({ studentId });
    if (!result.found) {
      return result;
    }
    if ('student' in result) {
      studentData = result.student;
    }
  } else {
    const result = await getStudentByName({ firstName, lastName, fullName });
    if (!result.found) {
      return result;
    }
    if ('students' in result && result.students && result.students.length > 0) {
      studentData = result.students[0];
    }
  }

  if (!studentData) {
    return { found: false, message: 'Étudiant non trouvé' };
  }

  const delayLevel = studentData.niveauRetard as string;
  const isUpToDate = delayLevel === 'bien' || delayLevel === 'en avance' || delayLevel === 'Validé';
  const isBehind = delayLevel === 'en retard' || delayLevel === 'Non Validé';

  return {
    found: true,
    student: studentData,
    analysis: {
      estAJour: isUpToDate,
      estEnRetard: isBehind,
      niveauRetard: delayLevel,
      projetActuel: studentData.projetActuel,
      statutProjet: studentData.statutProgression,
      resume: isUpToDate
        ? `${studentData.nom} est à jour sur ses projets (${delayLevel}). Projet actuel: ${studentData.projetActuel}`
        : isBehind
          ? `${studentData.nom} est en retard sur ses projets (${delayLevel}). Projet actuel: ${studentData.projetActuel}`
          : `${studentData.nom} - statut: ${delayLevel}. Projet actuel: ${studentData.projetActuel}`
    }
  };
}

async function listStudentsByStatus({ status, promoName, limit }: z.infer<typeof listStudentsByStatusSchema>) {
  const conditions = [eq(studentProjects.delay_level, status)];
  if (promoName) {
    conditions.push(eq(students.promoName, promoName));
  }

  const results = await db
    .select({
      id: students.id,
      firstName: students.first_name,
      lastName: students.last_name,
      login: students.login,
      promoName: students.promoName,
      projectName: studentProjects.project_name,
      progressStatus: studentProjects.progress_status,
      delayLevel: studentProjects.delay_level
    })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
    .where(and(...conditions))
    .limit(limit);

  const promoText = promoName ? ` dans la promo ${promoName}` : '';

  return {
    status,
    count: results.length,
    message: `${results.length} étudiant(s) avec le statut "${status}"${promoText}`,
    students: results.map(s => ({
      id: s.id,
      nom: `${s.firstName} ${s.lastName}`,
      login: s.login,
      promo: s.promoName,
      projetActuel: s.projectName || 'Non défini',
      statut: s.progressStatus || 'Non défini'
    }))
  };
}

async function listStudentsByPromo({ promoName, limit }: z.infer<typeof listStudentsByPromoSchema>) {
  const results = await db
    .select({
      id: students.id,
      firstName: students.first_name,
      lastName: students.last_name,
      login: students.login,
      promoName: students.promoName,
      projectName: studentProjects.project_name,
      progressStatus: studentProjects.progress_status,
      delayLevel: studentProjects.delay_level
    })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
    .where(eq(students.promoName, promoName))
    .limit(limit);

  if (results.length === 0) {
    return { found: false, message: `Aucun étudiant trouvé dans la promotion "${promoName}"` };
  }

  // Calculer les stats par statut
  const statsByStatus: Record<string, number> = {};
  results.forEach(s => {
    const status = s.delayLevel || 'Non défini';
    statsByStatus[status] = (statsByStatus[status] || 0) + 1;
  });

  return {
    found: true,
    promoName,
    count: results.length,
    statsParStatut: statsByStatus,
    students: results.map(s => ({
      id: s.id,
      nom: `${s.firstName} ${s.lastName}`,
      login: s.login,
      projetActuel: s.projectName || 'Non défini',
      statut: s.progressStatus || 'Non défini',
      niveau: s.delayLevel || 'Non défini'
    }))
  };
}

async function listStudentsByProject({ projectName, track, limit }: z.infer<typeof listStudentsByProjectSchema>) {
  const searchPattern = `%${projectName}%`;

  let whereClause;
  if (track === 'all') {
    whereClause = or(
      ilike(studentProjects.project_name, searchPattern),
      ilike(studentCurrentProjects.golang_project, searchPattern),
      ilike(studentCurrentProjects.javascript_project, searchPattern),
      ilike(studentCurrentProjects.rust_project, searchPattern),
      ilike(studentCurrentProjects.java_project, searchPattern)
    );
  } else {
    const trackColumn = {
      golang: studentCurrentProjects.golang_project,
      javascript: studentCurrentProjects.javascript_project,
      rust: studentCurrentProjects.rust_project,
      java: studentCurrentProjects.java_project
    }[track];
    whereClause = ilike(trackColumn, searchPattern);
  }

  const results = await db
    .select({
      id: students.id,
      firstName: students.first_name,
      lastName: students.last_name,
      login: students.login,
      promoName: students.promoName,
      projectName: studentProjects.project_name,
      progressStatus: studentProjects.progress_status,
      delayLevel: studentProjects.delay_level,
      golangProject: studentCurrentProjects.golang_project,
      javascriptProject: studentCurrentProjects.javascript_project,
      rustProject: studentCurrentProjects.rust_project,
      javaProject: studentCurrentProjects.java_project
    })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
    .leftJoin(studentCurrentProjects, eq(students.id, studentCurrentProjects.student_id))
    .where(whereClause)
    .limit(limit);

  return {
    projectName,
    track,
    count: results.length,
    students: results.map(s => ({
      id: s.id,
      nom: `${s.firstName} ${s.lastName}`,
      login: s.login,
      promo: s.promoName,
      projetActuel: s.projectName,
      statut: s.progressStatus,
      niveau: s.delayLevel,
      projets: {
        golang: s.golangProject,
        javascript: s.javascriptProject,
        rust: s.rustProject,
        java: s.javaProject
      }
    }))
  };
}

async function getStats({ promoName }: z.infer<typeof getStatsSchema>) {
  const conditions = promoName ? [eq(students.promoName, promoName)] : [];

  // Total étudiants
  const totalQuery = db.select({ count: count() }).from(students);
  if (promoName) totalQuery.where(eq(students.promoName, promoName));
  const totalResult = await totalQuery;
  const total = totalResult[0].count;

  // Stats par statut de retard
  const statusQuery = db
    .select({
      delayLevel: studentProjects.delay_level,
      count: count()
    })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id));
  if (promoName) statusQuery.where(eq(students.promoName, promoName));
  const statusResults = await statusQuery.groupBy(studentProjects.delay_level);

  const statsByStatus: Record<string, number> = {};
  statusResults.forEach(r => {
    statsByStatus[r.delayLevel || 'Non défini'] = r.count;
  });

  // Calculer les taux
  const enRetard = statsByStatus['en retard'] || 0;
  const bien = statsByStatus['bien'] || 0;
  const enAvance = statsByStatus['en avance'] || 0;
  const valide = statsByStatus['Validé'] || 0;
  const nonValide = statsByStatus['Non Validé'] || 0;
  const specialite = statsByStatus['spécialité'] || 0;

  const promoText = promoName ? ` pour la promotion ${promoName}` : ' (toutes promotions)';

  return {
    promoName: promoName || 'Toutes',
    totalEtudiants: total,
    repartitionStatuts: {
      enRetard,
      bien,
      enAvance,
      valide,
      nonValide,
      specialite
    },
    taux: {
      tauxRetard: total > 0 ? Math.round((enRetard / total) * 100) : 0,
      tauxBien: total > 0 ? Math.round((bien / total) * 100) : 0,
      tauxAvance: total > 0 ? Math.round((enAvance / total) * 100) : 0,
      tauxValide: total > 0 ? Math.round((valide / total) * 100) : 0,
      tauxNonValide: total > 0 ? Math.round((nonValide / total) * 100) : 0,
      tauxSpecialite: total > 0 ? Math.round((specialite / total) * 100) : 0
    },
    resume: `Statistiques${promoText}: ${total} étudiants - ${enRetard} en retard (${total > 0 ? Math.round((enRetard / total) * 100) : 0}%), ${bien} bien (${total > 0 ? Math.round((bien / total) * 100) : 0}%), ${enAvance} en avance, ${valide} validés, ${specialite} en spécialité`
  };
}

async function getTrackStats({ track, promoName }: z.infer<typeof getTrackStatsSchema>) {
  const completedColumn = {
    golang: studentSpecialtyProgress.golang_completed,
    javascript: studentSpecialtyProgress.javascript_completed,
    rust: studentSpecialtyProgress.rust_completed,
    java: studentSpecialtyProgress.java_completed
  }[track];

  const conditions = promoName ? [eq(students.promoName, promoName)] : [];

  // Total et complétés
  const query = db
    .select({
      completed: completedColumn,
      count: count()
    })
    .from(students)
    .leftJoin(studentSpecialtyProgress, eq(students.id, studentSpecialtyProgress.student_id));

  if (promoName) query.where(eq(students.promoName, promoName));

  const results = await query.groupBy(completedColumn);

  let total = 0;
  let completed = 0;
  let notCompleted = 0;

  results.forEach(r => {
    total += r.count;
    if (r.completed === true) completed = r.count;
    else notCompleted += r.count;
  });

  const promoText = promoName ? ` dans ${promoName}` : '';

  return {
    track,
    promoName: promoName || 'Toutes',
    total,
    termines: completed,
    enCours: notCompleted,
    tauxCompletion: total > 0 ? Math.round((completed / total) * 100) : 0,
    resume: `Filière ${track.toUpperCase()}${promoText}: ${completed}/${total} étudiants ont terminé (${total > 0 ? Math.round((completed / total) * 100) : 0}%)`
  };
}

async function compareStudents({ studentIds }: z.infer<typeof compareStudentsSchema>) {
  const studentsData = await Promise.all(
    studentIds.map(id => getStudentById({ studentId: id }))
  );

  const validStudents = studentsData
    .filter(r => r.found && 'student' in r)
    .map(r => (r as { found: true; student: ReturnType<typeof getStudentById> extends Promise<infer T> ? T extends { student: infer S } ? S : never : never }).student);

  if (validStudents.length < 2) {
    return { success: false, message: 'Au moins 2 étudiants valides sont nécessaires pour comparer' };
  }

  return {
    success: true,
    nombreCompares: validStudents.length,
    etudiants: validStudents,
    comparaison: {
      promotions: [...new Set(validStudents.map(s => s.promo))],
      statuts: validStudents.map(s => ({ nom: s.nom, statut: s.niveauRetard })),
      projets: validStudents.map(s => ({ nom: s.nom, projet: s.projetActuel }))
    }
  };
}

async function listAllPromos() {
  const results = await db.select().from(promotions);

  // Compter les étudiants par promo
  const promosWithCounts = await Promise.all(
    results.map(async (promo) => {
      const countResult = await db
        .select({ count: count() })
        .from(students)
        .where(eq(students.promoName, promo.name));

      return {
        id: promo.promoId,
        nom: promo.name,
        nombreEtudiants: countResult[0].count
      };
    })
  );

  return {
    count: promosWithCounts.length,
    promotions: promosWithCounts
  };
}

async function listStudentsAhead({ promoName, limit }: z.infer<typeof listStudentsAheadSchema>) {
  return listStudentsByStatus({ status: 'en avance', promoName, limit });
}

async function listStudentsBehind({ promoName, limit }: z.infer<typeof listStudentsBehindSchema>) {
  return listStudentsByStatus({ status: 'en retard', promoName, limit });
}

async function getStudentsByTrackCompletion({ track, completed, promoName, limit }: z.infer<typeof getStudentsByTrackCompletionSchema>) {
  const completedColumn = {
    golang: studentSpecialtyProgress.golang_completed,
    javascript: studentSpecialtyProgress.javascript_completed,
    rust: studentSpecialtyProgress.rust_completed,
    java: studentSpecialtyProgress.java_completed
  }[track];

  const conditions = [eq(completedColumn, completed)];
  if (promoName) {
    conditions.push(eq(students.promoName, promoName));
  }

  const results = await db
    .select({
      id: students.id,
      firstName: students.first_name,
      lastName: students.last_name,
      login: students.login,
      promoName: students.promoName,
      projectName: studentProjects.project_name,
      progressStatus: studentProjects.progress_status,
      delayLevel: studentProjects.delay_level
    })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
    .leftJoin(studentSpecialtyProgress, eq(students.id, studentSpecialtyProgress.student_id))
    .where(and(...conditions))
    .limit(limit);

  const statusText = completed ? 'ont terminé' : "n'ont pas terminé";
  const promoText = promoName ? ` dans ${promoName}` : '';

  return {
    track,
    completed,
    count: results.length,
    message: `${results.length} étudiant(s) ${statusText} la filière ${track.toUpperCase()}${promoText}`,
    students: results.map(s => ({
      id: s.id,
      nom: `${s.firstName} ${s.lastName}`,
      login: s.login,
      promo: s.promoName,
      projetActuel: s.projectName || 'Non défini',
      statut: s.progressStatus || 'Non défini',
      niveau: s.delayLevel || 'Non défini'
    }))
  };
}

// =============================================================================
// EXPORT DES OUTILS POUR L'IA (AI SDK v3 format)
// =============================================================================

export const novaTools = {
  searchStudents: {
    description: `Recherche des étudiants par nom, prénom, login ou partie de nom.
    Utilise cette fonction quand l'utilisateur veut trouver un ou plusieurs étudiants.
    Exemples: "cherche Maxime", "trouve les étudiants Dubois", "qui est mdubois"`,
    parameters: searchStudentsSchema,
    execute: searchStudents
  },

  getStudentById: {
    description: `Récupère les informations complètes d'un étudiant par son ID numérique.
    Utilise après avoir trouvé l'ID via searchStudents ou getStudentByName.`,
    parameters: getStudentByIdSchema,
    execute: getStudentById
  },

  getStudentByName: {
    description: `Récupère les informations détaillées d'un étudiant par son nom.
    Peut rechercher par prénom, nom de famille ou nom complet.
    Utilise quand l'utilisateur demande des infos sur un étudiant spécifique.
    Exemples: "infos sur Maxime Dubois", "détails de Marie Martin"`,
    parameters: getStudentByNameSchema,
    execute: getStudentByName
  },

  checkStudentProgress: {
    description: `Vérifie si un étudiant est à jour sur ses projets.
    UTILISE CETTE FONCTION quand l'utilisateur demande si quelqu'un est "à jour", "en retard", "avance bien", etc.
    Exemples: "Est-ce que Maxime Dubois est à jour ?", "Pierre est-il en retard ?", "Marie avance bien ?"`,
    parameters: checkStudentProgressSchema,
    execute: checkStudentProgress
  },

  listStudentsByStatus: {
    description: `Liste les étudiants selon leur statut de progression.
    Statuts: 'en retard', 'bien', 'en avance', 'Validé', 'Non Validé', 'spécialité'.
    Exemples: "qui est en retard ?", "liste des étudiants validés", "étudiants en avance"`,
    parameters: listStudentsByStatusSchema,
    execute: listStudentsByStatus
  },

  listStudentsByPromo: {
    description: `Liste tous les étudiants d'une promotion spécifique avec leurs statistiques.
    Exemples: "étudiants de P1", "liste de la promo 2024", "qui est dans P2 ?"`,
    parameters: listStudentsByPromoSchema,
    execute: listStudentsByPromo
  },

  listStudentsByProject: {
    description: `Liste les étudiants travaillant sur un projet spécifique.
    Peut filtrer par filière (golang, javascript, rust, java).
    Exemples: "qui travaille sur ascii-art ?", "étudiants sur le projet forum"`,
    parameters: listStudentsByProjectSchema,
    execute: listStudentsByProject
  },

  listStudentsAhead: {
    description: `Liste les étudiants en avance sur leur progression.
    Exemples: "qui est en avance ?", "étudiants qui avancent bien", "les meilleurs élèves"`,
    parameters: listStudentsAheadSchema,
    execute: listStudentsAhead
  },

  listStudentsBehind: {
    description: `Liste les étudiants en retard sur leur progression.
    Exemples: "qui est en retard ?", "étudiants en difficulté", "qui a besoin d'aide ?"`,
    parameters: listStudentsBehindSchema,
    execute: listStudentsBehind
  },

  getStats: {
    description: `Récupère les statistiques globales ou par promotion.
    Inclut: total étudiants, répartition par statut, taux de progression.
    Exemples: "statistiques globales", "stats de P1", "combien d'étudiants en retard ?"`,
    parameters: getStatsSchema,
    execute: getStats
  },

  getTrackStats: {
    description: `Récupère les statistiques d'une filière spécifique (golang, javascript, rust, java).
    Inclut: taux de complétion, nombre terminés/en cours.
    Exemples: "stats golang", "combien ont fini javascript ?", "progression en rust"`,
    parameters: getTrackStatsSchema,
    execute: getTrackStats
  },

  getStudentsByTrackCompletion: {
    description: `Liste les étudiants selon leur avancement dans une filière.
    Exemples: "qui a terminé golang ?", "étudiants qui n'ont pas fini javascript"`,
    parameters: getStudentsByTrackCompletionSchema,
    execute: getStudentsByTrackCompletion
  },

  compareStudents: {
    description: `Compare plusieurs étudiants (2 à 5) entre eux.
    Utilise les IDs des étudiants trouvés via searchStudents ou getStudentByName.
    Exemples: "compare Pierre et Marie", "différences entre ces 3 étudiants"`,
    parameters: compareStudentsSchema,
    execute: compareStudents
  },

  listAllPromos: {
    description: `Liste toutes les promotions avec le nombre d'étudiants dans chacune.
    Exemples: "quelles sont les promos ?", "liste des promotions", "combien de promos ?"`,
    parameters: listAllPromosSchema,
    execute: listAllPromos
  }
};

export type NovaTools = typeof novaTools;
