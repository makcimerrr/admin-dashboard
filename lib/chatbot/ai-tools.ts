import { z } from 'zod';
import { db } from '@/lib/db/config';
import {
  students,
  studentProjects,
  studentCurrentProjects,
  studentSpecialtyProgress
} from '@/lib/db/schema/students';
import { promotions } from '@/lib/db/schema/promotions';
import { audits, auditResults } from '@/lib/db/schema/audits';
import { groupStatuses } from '@/lib/db/schema/groupStatuses';
import { alternantContracts } from '@/lib/db/schema/alternants';
import { eq, ilike, or, and, count, sql, desc, isNotNull, isNull, inArray } from 'drizzle-orm';

// =============================================================================
// HELPERS
// =============================================================================

function studentDetailSelect() {
  return {
    id: students.id,
    firstName: students.first_name,
    lastName: students.last_name,
    login: students.login,
    promoName: students.promoName,
    availableAt: students.availableAt,
    isDropout: students.isDropout,
    dropoutReason: students.dropoutReason,
    dropoutAt: students.dropoutAt,
    dropoutNotes: students.dropoutNotes,
    isAlternant: students.isAlternant,
    companyName: students.companyName,
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
  };
}

function studentDetailJoins(query: any) {
  return query
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
    .leftJoin(studentCurrentProjects, eq(students.id, studentCurrentProjects.student_id))
    .leftJoin(studentSpecialtyProgress, eq(students.id, studentSpecialtyProgress.student_id));
}

function formatStudent(s: any) {
  return {
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
    estEnPerdition: s.isDropout || false,
    raisonPerdition: s.dropoutReason || null,
    datePerdition: s.dropoutAt || null,
    notesPerdition: s.dropoutNotes || null,
    estAlternant: s.isAlternant || false,
    entreprise: s.companyName || null,
    projetsParFiliere: {
      golang: { projet: s.golangProject, statut: s.golangStatus, termine: s.golangCompleted },
      javascript: { projet: s.javascriptProject, statut: s.javascriptStatus, termine: s.javascriptCompleted },
      rust: { projet: s.rustProject, statut: s.rustStatus, termine: s.rustCompleted },
      java: { projet: s.javaProject, statut: s.javaStatus, termine: s.javaCompleted }
    }
  };
}

function formatStudentShort(s: any) {
  return {
    id: s.id,
    nom: `${s.firstName} ${s.lastName}`,
    login: s.login,
    promo: s.promoName,
    projetActuel: s.projectName || 'Non défini',
    statut: s.progressStatus || 'Non défini',
    niveau: s.delayLevel || 'Non défini',
    perdition: s.isDropout || false,
    alternant: s.isAlternant || false
  };
}

// =============================================================================
// TOOL IMPLEMENTATIONS
// =============================================================================

async function searchStudents({ query, limit }: { query: string; limit: number }) {
  const searchPattern = `%${query}%`;
  const results = await studentDetailJoins(db.select(studentDetailSelect()))
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
  return { found: true, count: results.length, students: results.map(formatStudent) };
}

async function getStudentById({ studentId }: { studentId: number }) {
  const result = await studentDetailJoins(db.select(studentDetailSelect()))
    .where(eq(students.id, studentId))
    .limit(1);

  if (result.length === 0) return { found: false, message: `Aucun étudiant avec l'ID ${studentId}` };
  return { found: true, student: formatStudent(result[0]) };
}

async function getStudentByName({ firstName, lastName, fullName }: { firstName?: string; lastName?: string; fullName?: string }) {
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
      whereClause = or(ilike(students.first_name, `%${fullName}%`), ilike(students.last_name, `%${fullName}%`));
    }
  } else if (firstName && lastName) {
    whereClause = and(ilike(students.first_name, `%${firstName}%`), ilike(students.last_name, `%${lastName}%`));
  } else if (firstName) {
    whereClause = ilike(students.first_name, `%${firstName}%`);
  } else if (lastName) {
    whereClause = ilike(students.last_name, `%${lastName}%`);
  } else {
    return { found: false, message: 'Veuillez fournir au moins un nom, prénom ou nom complet' };
  }

  const results = await studentDetailJoins(db.select(studentDetailSelect()))
    .where(whereClause)
    .limit(5);

  if (results.length === 0) {
    return { found: false, message: `Aucun étudiant trouvé pour "${fullName || `${firstName || ''} ${lastName || ''}`.trim()}"` };
  }
  return { found: true, count: results.length, students: results.map(formatStudent) };
}

async function checkStudentProgress({ firstName, lastName, fullName, studentId }: { firstName?: string; lastName?: string; fullName?: string; studentId?: number }) {
  let studentData: any = null;
  if (studentId) {
    const result = await getStudentById({ studentId });
    if (!result.found) return result;
    if ('student' in result) studentData = result.student;
  } else {
    const result = await getStudentByName({ firstName, lastName, fullName });
    if (!result.found) return result;
    if ('students' in result && result.students && result.students.length > 0) studentData = result.students[0];
  }
  if (!studentData) return { found: false, message: 'Étudiant non trouvé' };

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
      estEnPerdition: studentData.estEnPerdition,
      estAlternant: studentData.estAlternant
    }
  };
}

async function listStudentsByStatus({ status, promoName, limit }: { status: string; promoName?: string; limit: number }) {
  const conditions: any[] = [eq(studentProjects.delay_level, status)];
  if (promoName) conditions.push(eq(students.promoName, promoName));

  const results = await db
    .select({
      id: students.id, firstName: students.first_name, lastName: students.last_name,
      login: students.login, promoName: students.promoName, isDropout: students.isDropout, isAlternant: students.isAlternant,
      projectName: studentProjects.project_name, progressStatus: studentProjects.progress_status, delayLevel: studentProjects.delay_level
    })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
    .where(and(...conditions))
    .limit(limit);

  return {
    status, count: results.length,
    message: `${results.length} étudiant(s) avec le statut "${status}"${promoName ? ` dans ${promoName}` : ''}`,
    students: results.map(formatStudentShort)
  };
}

async function listStudentsByPromo({ promoName, limit }: { promoName: string; limit: number }) {
  const results = await db
    .select({
      id: students.id, firstName: students.first_name, lastName: students.last_name,
      login: students.login, promoName: students.promoName, isDropout: students.isDropout, isAlternant: students.isAlternant,
      projectName: studentProjects.project_name, progressStatus: studentProjects.progress_status, delayLevel: studentProjects.delay_level
    })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
    .where(eq(students.promoName, promoName))
    .limit(limit);

  if (results.length === 0) return { found: false, message: `Aucun étudiant dans "${promoName}"` };

  const statsByStatus: Record<string, number> = {};
  results.forEach(s => { statsByStatus[s.delayLevel || 'Non défini'] = (statsByStatus[s.delayLevel || 'Non défini'] || 0) + 1; });

  return { found: true, promoName, count: results.length, statsParStatut: statsByStatus, students: results.map(formatStudentShort) };
}

async function listStudentsByProject({ projectName, track, limit }: { projectName: string; track: string; limit: number }) {
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
    const col = { golang: studentCurrentProjects.golang_project, javascript: studentCurrentProjects.javascript_project, rust: studentCurrentProjects.rust_project, java: studentCurrentProjects.java_project }[track];
    whereClause = ilike(col!, searchPattern);
  }

  const results = await db
    .select({
      id: students.id, firstName: students.first_name, lastName: students.last_name,
      login: students.login, promoName: students.promoName, isDropout: students.isDropout, isAlternant: students.isAlternant,
      projectName: studentProjects.project_name, progressStatus: studentProjects.progress_status, delayLevel: studentProjects.delay_level
    })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
    .leftJoin(studentCurrentProjects, eq(students.id, studentCurrentProjects.student_id))
    .where(whereClause)
    .limit(limit);

  return { projectName, track, count: results.length, students: results.map(formatStudentShort) };
}

async function getStats({ promoName }: { promoName?: string }) {
  const promoFilter = promoName ? eq(students.promoName, promoName) : undefined;

  const [totalResult, statusResults, dropoutResult, alternantResult] = await Promise.all([
    db.select({ count: count() }).from(students).where(promoFilter),
    db.select({ delayLevel: studentProjects.delay_level, count: count() })
      .from(students).leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
      .where(promoFilter).groupBy(studentProjects.delay_level),
    db.select({ count: count() }).from(students).where(promoFilter ? and(promoFilter, eq(students.isDropout, true)) : eq(students.isDropout, true)),
    db.select({ count: count() }).from(students).where(promoFilter ? and(promoFilter, eq(students.isAlternant, true)) : eq(students.isAlternant, true))
  ]);

  const total = totalResult[0].count;
  const statsByStatus: Record<string, number> = {};
  statusResults.forEach(r => { statsByStatus[r.delayLevel || 'Non défini'] = r.count; });

  return {
    promoName: promoName || 'Toutes',
    totalEtudiants: total,
    enPerdition: dropoutResult[0].count,
    alternants: alternantResult[0].count,
    repartitionStatuts: statsByStatus,
    taux: Object.fromEntries(Object.entries(statsByStatus).map(([k, v]) => [k, total > 0 ? Math.round((v / total) * 100) : 0]))
  };
}

async function getTrackStats({ track, promoName }: { track: string; promoName?: string }) {
  const completedColumn = { golang: studentSpecialtyProgress.golang_completed, javascript: studentSpecialtyProgress.javascript_completed, rust: studentSpecialtyProgress.rust_completed, java: studentSpecialtyProgress.java_completed }[track]!;
  const promoFilter = promoName ? eq(students.promoName, promoName) : undefined;

  const results = await db
    .select({ completed: completedColumn, count: count() })
    .from(students)
    .leftJoin(studentSpecialtyProgress, eq(students.id, studentSpecialtyProgress.student_id))
    .where(promoFilter)
    .groupBy(completedColumn);

  let total = 0, completed = 0;
  results.forEach(r => { total += r.count; if (r.completed === true) completed = r.count; });

  return { track, total, termines: completed, enCours: total - completed, tauxCompletion: total > 0 ? Math.round((completed / total) * 100) : 0 };
}

async function compareStudents({ studentIds }: { studentIds: number[] }) {
  const studentsData = await Promise.all(studentIds.map(id => getStudentById({ studentId: id })));
  const valid = studentsData.filter(r => r.found && 'student' in r).map(r => (r as any).student);
  if (valid.length < 2) return { success: false, message: 'Au moins 2 étudiants valides sont nécessaires' };
  return { success: true, nombreCompares: valid.length, etudiants: valid };
}

async function listAllPromos() {
  const results = await db
    .select({ name: promotions.name, promoId: promotions.promoId })
    .from(promotions);

  const promosWithCounts = await Promise.all(
    results.map(async (promo) => {
      const [countResult, dropoutCount] = await Promise.all([
        db.select({ count: count() }).from(students).where(eq(students.promoName, promo.name)),
        db.select({ count: count() }).from(students).where(and(eq(students.promoName, promo.name), eq(students.isDropout, true)))
      ]);
      return { id: promo.promoId, nom: promo.name, nombreEtudiants: countResult[0].count, enPerdition: dropoutCount[0].count };
    })
  );
  return { count: promosWithCounts.length, promotions: promosWithCounts };
}

async function getStudentsByTrackCompletion({ track, completed, promoName, limit }: { track: string; completed: boolean; promoName?: string; limit: number }) {
  const completedColumn = { golang: studentSpecialtyProgress.golang_completed, javascript: studentSpecialtyProgress.javascript_completed, rust: studentSpecialtyProgress.rust_completed, java: studentSpecialtyProgress.java_completed }[track]!;
  const conditions: any[] = [eq(completedColumn, completed)];
  if (promoName) conditions.push(eq(students.promoName, promoName));

  const results = await db
    .select({
      id: students.id, firstName: students.first_name, lastName: students.last_name,
      login: students.login, promoName: students.promoName, isDropout: students.isDropout, isAlternant: students.isAlternant,
      projectName: studentProjects.project_name, progressStatus: studentProjects.progress_status, delayLevel: studentProjects.delay_level
    })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
    .leftJoin(studentSpecialtyProgress, eq(students.id, studentSpecialtyProgress.student_id))
    .where(and(...conditions))
    .limit(limit);

  return { track, completed, count: results.length, students: results.map(formatStudentShort) };
}

// =============================================================================
// NEW TOOLS - Dropouts, Alternants, Audits, Groups
// =============================================================================

async function listDropoutStudents({ promoName, limit }: { promoName?: string; limit: number }) {
  const conditions: any[] = [eq(students.isDropout, true)];
  if (promoName) conditions.push(eq(students.promoName, promoName));

  const results = await db
    .select({
      id: students.id, firstName: students.first_name, lastName: students.last_name,
      login: students.login, promoName: students.promoName,
      dropoutReason: students.dropoutReason, dropoutAt: students.dropoutAt, dropoutNotes: students.dropoutNotes,
      isAlternant: students.isAlternant, isDropout: students.isDropout,
      projectName: studentProjects.project_name, progressStatus: studentProjects.progress_status, delayLevel: studentProjects.delay_level
    })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
    .where(and(...conditions))
    .limit(limit);

  return {
    count: results.length,
    message: `${results.length} étudiant(s) en perdition${promoName ? ` dans ${promoName}` : ''}`,
    students: results.map(s => ({
      ...formatStudentShort(s),
      raisonPerdition: s.dropoutReason,
      datePerdition: s.dropoutAt,
      notes: s.dropoutNotes
    }))
  };
}

async function listAlternantStudents({ promoName, limit }: { promoName?: string; limit: number }) {
  const conditions: any[] = [eq(students.isAlternant, true)];
  if (promoName) conditions.push(eq(students.promoName, promoName));

  const results = await db
    .select({
      id: students.id, firstName: students.first_name, lastName: students.last_name,
      login: students.login, promoName: students.promoName,
      companyName: students.companyName, companyContact: students.companyContact, companyEmail: students.companyEmail,
      alternantStartDate: students.alternantStartDate, alternantEndDate: students.alternantEndDate,
      isAlternant: students.isAlternant, isDropout: students.isDropout,
      projectName: studentProjects.project_name, progressStatus: studentProjects.progress_status, delayLevel: studentProjects.delay_level
    })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
    .where(and(...conditions))
    .limit(limit);

  return {
    count: results.length,
    message: `${results.length} alternant(s)${promoName ? ` dans ${promoName}` : ''}`,
    students: results.map(s => ({
      ...formatStudentShort(s),
      entreprise: s.companyName,
      tuteur: s.companyContact,
      emailTuteur: s.companyEmail,
      debut: s.alternantStartDate,
      fin: s.alternantEndDate
    }))
  };
}

async function getAuditStats({ promoId, track }: { promoId?: string; track?: string }) {
  const conditions: any[] = [];
  if (promoId) conditions.push(eq(audits.promoId, promoId));
  if (track) conditions.push(eq(audits.track, track));

  const results = await db
    .select({
      id: audits.id, promoId: audits.promoId, track: audits.track,
      projectName: audits.projectName, groupId: audits.groupId,
      summary: audits.summary, priority: audits.priority,
      auditorName: audits.auditorName, validatedCount: audits.validatedCount,
      totalMembers: audits.totalMembers, createdAt: audits.createdAt
    })
    .from(audits)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(audits.createdAt))
    .limit(20);

  const totalAudits = results.length;
  const byPriority: Record<string, number> = {};
  results.forEach(a => { byPriority[a.priority || 'normal'] = (byPriority[a.priority || 'normal'] || 0) + 1; });

  return {
    totalAudits,
    parPriorite: byPriority,
    audits: results.map(a => ({
      id: a.id, promo: a.promoId, filiere: a.track, projet: a.projectName,
      auditeur: a.auditorName, priorite: a.priority,
      valides: a.validatedCount, totalMembres: a.totalMembers,
      resume: a.summary?.slice(0, 200) || null, date: a.createdAt
    }))
  };
}

async function getGroupsInAudit({ promoId }: { promoId?: string }) {
  const conditions: any[] = [eq(groupStatuses.status, 'audit')];
  if (promoId) conditions.push(eq(groupStatuses.promoId, promoId));

  const results = await db.select().from(groupStatuses).where(and(...conditions));

  return {
    count: results.length,
    message: `${results.length} groupe(s) en attente d'audit${promoId ? ` pour la promo ${promoId}` : ''}`,
    groupes: results.map(g => ({
      id: g.id, groupId: g.groupId, promo: g.promoId, projet: g.projectName,
      capitaine: g.captainLogin, notifie: !!g.notifiedAuditAt,
      creneauReserve: !!g.slotDate, dateCreneauAudit: g.slotDate
    }))
  };
}

// =============================================================================
// WRITE TOOLS - Dropout management
// =============================================================================

const DROPOUT_REASONS = ['abandon', 'exclusion', 'reorientation', 'medical', 'personal', 'financial', 'other'] as const;

async function markStudentAsDropout({ studentId, reason, notes }: { studentId: number; reason: string; notes?: string }) {
  // Verify student exists
  const student = await db
    .select({ id: students.id, firstName: students.first_name, lastName: students.last_name, promoName: students.promoName, isDropout: students.isDropout })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);

  if (student.length === 0) return { success: false, message: `Aucun étudiant avec l'ID ${studentId}` };
  if (student[0].isDropout) return { success: false, message: `${student[0].firstName} ${student[0].lastName} est déjà en perdition` };

  await db.update(students).set({
    isDropout: true,
    dropoutAt: new Date(),
    dropoutReason: reason,
    dropoutNotes: notes || null,
    previousPromo: student[0].promoName
  }).where(eq(students.id, studentId));

  return {
    success: true,
    message: `${student[0].firstName} ${student[0].lastName} a été marqué en perdition (raison: ${reason})`,
    student: { id: student[0].id, nom: `${student[0].firstName} ${student[0].lastName}`, promo: student[0].promoName }
  };
}

async function reactivateStudent({ studentId }: { studentId: number }) {
  const student = await db
    .select({ id: students.id, firstName: students.first_name, lastName: students.last_name, isDropout: students.isDropout })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);

  if (student.length === 0) return { success: false, message: `Aucun étudiant avec l'ID ${studentId}` };
  if (!student[0].isDropout) return { success: false, message: `${student[0].firstName} ${student[0].lastName} n'est pas en perdition` };

  await db.update(students).set({
    isDropout: false,
    dropoutAt: null,
    dropoutReason: null,
    dropoutNotes: null
  }).where(eq(students.id, studentId));

  return {
    success: true,
    message: `${student[0].firstName} ${student[0].lastName} a été réactivé`,
    student: { id: student[0].id, nom: `${student[0].firstName} ${student[0].lastName}` }
  };
}

// =============================================================================
// WRITE TOOLS - Transfer, Alternant, Discord, Update
// =============================================================================

async function transferStudent({ studentLogin, targetPromoName, reason }: { studentLogin: string; targetPromoName: string; reason?: string }) {
  // Verify student exists
  const student = await db
    .select({ id: students.id, firstName: students.first_name, lastName: students.last_name, login: students.login, promoName: students.promoName })
    .from(students)
    .where(eq(students.login, studentLogin))
    .limit(1);

  if (student.length === 0) return { success: false, message: `Aucun étudiant avec le login "${studentLogin}"` };

  const oldPromo = student[0].promoName;

  // Verify target promo exists
  const targetPromo = await db.select({ name: promotions.name }).from(promotions).where(eq(promotions.name, targetPromoName)).limit(1);
  if (targetPromo.length === 0) return { success: false, message: `Promotion "${targetPromoName}" non trouvée` };

  if (oldPromo === targetPromoName) return { success: false, message: `${student[0].firstName} ${student[0].lastName} est déjà dans ${targetPromoName}` };

  // Update student promo
  await db.update(students).set({
    promoName: targetPromoName,
    previousPromo: oldPromo
  }).where(eq(students.id, student[0].id));

  return {
    success: true,
    message: `${student[0].firstName} ${student[0].lastName} a été transféré de ${oldPromo} vers ${targetPromoName}`,
    student: { id: student[0].id, nom: `${student[0].firstName} ${student[0].lastName}`, anciennePromo: oldPromo, nouvellePromo: targetPromoName }
  };
}

async function markStudentAsAlternant({ studentId, companyName, companyContact, companyEmail, startDate, endDate, notes }: {
  studentId: number; companyName: string; companyContact?: string; companyEmail?: string; startDate?: string; endDate?: string; notes?: string;
}) {
  const student = await db
    .select({ id: students.id, firstName: students.first_name, lastName: students.last_name, isAlternant: students.isAlternant })
    .from(students).where(eq(students.id, studentId)).limit(1);

  if (student.length === 0) return { success: false, message: `Aucun étudiant avec l'ID ${studentId}` };
  if (student[0].isAlternant) return { success: false, message: `${student[0].firstName} ${student[0].lastName} est déjà alternant` };

  await db.update(students).set({
    isAlternant: true,
    companyName,
    companyContact: companyContact || null,
    companyEmail: companyEmail || null,
    alternantStartDate: startDate ? new Date(startDate) : new Date(),
    alternantEndDate: endDate ? new Date(endDate) : null,
    alternantNotes: notes || null
  }).where(eq(students.id, studentId));

  return {
    success: true,
    message: `${student[0].firstName} ${student[0].lastName} est maintenant alternant chez ${companyName}`,
    student: { id: student[0].id, nom: `${student[0].firstName} ${student[0].lastName}`, entreprise: companyName }
  };
}

async function removeAlternantStatus({ studentId }: { studentId: number }) {
  const student = await db
    .select({ id: students.id, firstName: students.first_name, lastName: students.last_name, isAlternant: students.isAlternant })
    .from(students).where(eq(students.id, studentId)).limit(1);

  if (student.length === 0) return { success: false, message: `Aucun étudiant avec l'ID ${studentId}` };
  if (!student[0].isAlternant) return { success: false, message: `${student[0].firstName} ${student[0].lastName} n'est pas alternant` };

  await db.update(students).set({
    isAlternant: false, companyName: null, companyContact: null, companyEmail: null, companyPhone: null,
    alternantStartDate: null, alternantEndDate: null, alternantNotes: null
  }).where(eq(students.id, studentId));

  return {
    success: true,
    message: `Le statut alternant de ${student[0].firstName} ${student[0].lastName} a été retiré`
  };
}

async function resendAuditReminder({ groupStatusId }: { groupStatusId: number }) {
  const { getDiscordIdByLogin } = await import('@/lib/db/services/discordUsers');
  const { sendDiscordDM } = await import('@/lib/services/discord');
  const { markAuditNotified } = await import('@/lib/db/services/groupStatuses');
  const { getAllPromotions } = await import('@/lib/config/promotions');

  const rows = await db.select().from(groupStatuses).where(eq(groupStatuses.id, groupStatusId)).limit(1);
  if (rows.length === 0) return { success: false, message: 'Groupe non trouvé' };

  const row = rows[0];
  if (!row.captainLogin) return { success: false, message: 'Pas de capitaine pour ce groupe' };

  const discordId = await getDiscordIdByLogin(row.captainLogin);
  if (!discordId) return { success: false, message: `Pas de Discord ID pour ${row.captainLogin}` };

  const promos = await getAllPromotions();
  const promo = promos.find((p) => String(p.eventId) === row.promoId);
  const promoName = promo?.title ?? promo?.key ?? row.promoId;

  const message = [
    `Hey ${row.captainLogin} ! 👋`,
    ``, `Rappel : ton groupe est en attente de code-review pour **${row.projectName}** (${promoName}).`,
    ``, `N'oublie pas de réserver ton créneau ! 💪`
  ].join('\n');

  const sent = await sendDiscordDM(discordId, message);
  if (!sent) return { success: false, message: "Échec de l'envoi du DM Discord" };

  await markAuditNotified(row.id);
  return { success: true, message: `Rappel envoyé à ${row.captainLogin} pour ${row.projectName}` };
}

async function triggerStudentUpdate({ promoEventId }: { promoEventId: string }) {
  const promos = await db.select({ name: promotions.name, promoId: promotions.promoId }).from(promotions);
  const promo = promos.find(p => String(p.promoId) === promoEventId);
  if (!promo) return { success: false, message: `Promotion avec eventId ${promoEventId} non trouvée` };

  // Trigger the update via internal fetch
  try {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    const secret = process.env.CRON_SECRET || '';
    const res = await fetch(`${baseUrl}/api/cron/update-students?eventId=${promoEventId}&secret=${secret}`);
    const data = await res.json();
    if (data.success) {
      return { success: true, message: `Mise à jour lancée pour ${promo.name}: ${data.studentsUpdated} étudiants mis à jour (${data.duration})` };
    }
    return { success: false, message: data.error || 'Erreur lors de la mise à jour' };
  } catch (err) {
    return { success: false, message: `Erreur: ${err instanceof Error ? err.message : 'Unknown'}` };
  }
}

// =============================================================================
// TOOL - CSV Export
// =============================================================================

async function exportStudentsCsv({ promoName, status, includeDropouts }: { promoName?: string; status?: string; includeDropouts: boolean }) {
  const conditions: any[] = [];
  if (promoName) conditions.push(eq(students.promoName, promoName));
  if (status) conditions.push(eq(studentProjects.delay_level, status));
  if (!includeDropouts) conditions.push(sql`(${students.isDropout} IS NULL OR ${students.isDropout} = false)`);

  const results = await db
    .select({
      login: students.login, firstName: students.first_name, lastName: students.last_name,
      promo: students.promoName, projectName: studentProjects.project_name,
      progressStatus: studentProjects.progress_status, delayLevel: studentProjects.delay_level,
      isDropout: students.isDropout, isAlternant: students.isAlternant, companyName: students.companyName,
      golangProject: studentCurrentProjects.golang_project, golangStatus: studentCurrentProjects.golang_project_status,
      jsProject: studentCurrentProjects.javascript_project, jsStatus: studentCurrentProjects.javascript_project_status,
      rustProject: studentCurrentProjects.rust_project, rustStatus: studentCurrentProjects.rust_project_status,
      javaProject: studentCurrentProjects.java_project, javaStatus: studentCurrentProjects.java_project_status,
    })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
    .leftJoin(studentCurrentProjects, eq(students.id, studentCurrentProjects.student_id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(500);

  if (results.length === 0) return { success: false, message: 'Aucun étudiant trouvé pour ces critères' };

  const headers = ['Login', 'Prénom', 'Nom', 'Promo', 'Projet actuel', 'Statut', 'Niveau', 'Perdition', 'Alternant', 'Entreprise', 'Golang', 'JavaScript', 'Rust', 'Java'];
  const rows = results.map(r => [
    r.login, r.firstName, r.lastName, r.promo, r.projectName || '', r.progressStatus || '', r.delayLevel || '',
    r.isDropout ? 'Oui' : 'Non', r.isAlternant ? 'Oui' : 'Non', r.companyName || '',
    r.golangProject || '', r.jsProject || '', r.rustProject || '', r.javaProject || ''
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');

  return {
    success: true,
    count: results.length,
    csv: csvContent,
    message: `Export CSV généré : ${results.length} étudiants. Copiez le contenu CSV ci-dessous ou demandez-moi de le filtrer davantage.`
  };
}

// =============================================================================
// EXPORT DES OUTILS POUR L'IA (AI SDK format)
// =============================================================================

export const novaTools = {
  searchStudents: {
    description: `Recherche des étudiants par nom, prénom, login ou partie de nom. Exemples: "cherche Maxime", "trouve les Dubois", "qui est mdubois"`,
    inputSchema: z.object({
      query: z.string().describe('Nom, prénom, login ou partie du nom'),
      limit: z.number().optional().default(10).describe('Nombre max de résultats')
    }),
    execute: searchStudents
  },
  getStudentById: {
    description: `Récupère les informations complètes d'un étudiant par son ID numérique.`,
    inputSchema: z.object({ studentId: z.number().describe("L'ID numérique de l'étudiant") }),
    execute: getStudentById
  },
  getStudentByName: {
    description: `Récupère les informations détaillées d'un étudiant par son nom. Exemples: "infos sur Maxime Dubois", "détails de Marie"`,
    inputSchema: z.object({
      firstName: z.string().optional().describe("Prénom"),
      lastName: z.string().optional().describe("Nom de famille"),
      fullName: z.string().optional().describe("Nom complet")
    }),
    execute: getStudentByName
  },
  checkStudentProgress: {
    description: `Vérifie si un étudiant est à jour. Exemples: "Est-ce que Maxime est à jour ?", "Pierre est-il en retard ?"`,
    inputSchema: z.object({
      firstName: z.string().optional(), lastName: z.string().optional(),
      fullName: z.string().optional(), studentId: z.number().optional()
    }),
    execute: checkStudentProgress
  },
  listStudentsByStatus: {
    description: `Liste les étudiants par statut: 'en retard', 'bien', 'en avance', 'Validé', 'Non Validé', 'spécialité'`,
    inputSchema: z.object({
      status: z.enum(['en retard', 'bien', 'en avance', 'Validé', 'Non Validé', 'spécialité']),
      promoName: z.string().optional(), limit: z.number().optional().default(20)
    }),
    execute: listStudentsByStatus
  },
  listStudentsByPromo: {
    description: `Liste tous les étudiants d'une promotion avec stats. Exemples: "étudiants de P1", "qui est dans P2 ?"`,
    inputSchema: z.object({ promoName: z.string(), limit: z.number().optional().default(50) }),
    execute: listStudentsByPromo
  },
  listStudentsByProject: {
    description: `Liste les étudiants sur un projet spécifique. Exemples: "qui travaille sur ascii-art ?", "étudiants sur forum"`,
    inputSchema: z.object({
      projectName: z.string(), track: z.enum(['golang', 'javascript', 'rust', 'java', 'all']).optional().default('all'),
      limit: z.number().optional().default(20)
    }),
    execute: listStudentsByProject
  },
  listStudentsAhead: {
    description: `Liste les étudiants en avance. Exemples: "qui est en avance ?", "les meilleurs élèves"`,
    inputSchema: z.object({ promoName: z.string().optional(), limit: z.number().optional().default(20) }),
    execute: async (args: { promoName?: string; limit: number }) => listStudentsByStatus({ status: 'en avance', ...args })
  },
  listStudentsBehind: {
    description: `Liste les étudiants en retard. Exemples: "qui est en retard ?", "qui a besoin d'aide ?"`,
    inputSchema: z.object({ promoName: z.string().optional(), limit: z.number().optional().default(20) }),
    execute: async (args: { promoName?: string; limit: number }) => listStudentsByStatus({ status: 'en retard', ...args })
  },
  getStats: {
    description: `Statistiques globales ou par promotion. Inclut dropouts, alternants, répartition par statut.`,
    inputSchema: z.object({ promoName: z.string().optional() }),
    execute: getStats
  },
  getTrackStats: {
    description: `Statistiques d'une filière (golang, javascript, rust, java). Taux de complétion, terminés/en cours.`,
    inputSchema: z.object({ track: z.enum(['golang', 'javascript', 'rust', 'java']), promoName: z.string().optional() }),
    execute: getTrackStats
  },
  getStudentsByTrackCompletion: {
    description: `Liste les étudiants par avancement dans une filière. Exemples: "qui a terminé golang ?"`,
    inputSchema: z.object({
      track: z.enum(['golang', 'javascript', 'rust', 'java']), completed: z.boolean(),
      promoName: z.string().optional(), limit: z.number().optional().default(30)
    }),
    execute: getStudentsByTrackCompletion
  },
  compareStudents: {
    description: `Compare 2 à 5 étudiants entre eux par leurs IDs.`,
    inputSchema: z.object({ studentIds: z.array(z.number()).min(2).max(5) }),
    execute: compareStudents
  },
  listAllPromos: {
    description: `Liste toutes les promotions avec nombre d'étudiants et dropouts.`,
    inputSchema: z.object({}),
    execute: listAllPromos
  },
  // NEW TOOLS
  listDropoutStudents: {
    description: `Liste les étudiants en perdition (dropout). Exemples: "qui est en perdition ?", "étudiants qui ont abandonné", "dropouts de P1"`,
    inputSchema: z.object({ promoName: z.string().optional(), limit: z.number().optional().default(30) }),
    execute: listDropoutStudents
  },
  listAlternantStudents: {
    description: `Liste les étudiants alternants avec infos entreprise. Exemples: "qui est alternant ?", "alternants de P2", "étudiants en entreprise"`,
    inputSchema: z.object({ promoName: z.string().optional(), limit: z.number().optional().default(30) }),
    execute: listAlternantStudents
  },
  getAuditStats: {
    description: `Récupère les audits/code-reviews réalisés. Peut filtrer par promo et filière. Exemples: "audits récents", "code reviews de Golang", "combien d'audits ?"`,
    inputSchema: z.object({ promoId: z.string().optional(), track: z.string().optional() }),
    execute: getAuditStats
  },
  getGroupsInAudit: {
    description: `Liste les groupes en attente d'audit/code-review. Exemples: "groupes en audit", "qui attend une review ?", "groupes en attente"`,
    inputSchema: z.object({ promoId: z.string().optional() }),
    execute: getGroupsInAudit
  },
  // WRITE TOOLS
  markStudentAsDropout: {
    description: `Marque un étudiant comme en perdition (dropout). IMPORTANT: cherche d'abord l'étudiant pour obtenir son ID, puis demande confirmation à l'utilisateur avant d'exécuter. Raisons valides: abandon, exclusion, reorientation, medical, personal, financial, other. Exemples: "mets Maxime en perdition", "passe cet étudiant en dropout"`,
    inputSchema: z.object({
      studentId: z.number().describe("L'ID de l'étudiant à passer en perdition"),
      reason: z.enum(['abandon', 'exclusion', 'reorientation', 'medical', 'personal', 'financial', 'other']).describe('Raison de la perdition'),
      notes: z.string().optional().describe('Notes supplémentaires')
    }),
    execute: markStudentAsDropout
  },
  reactivateStudent: {
    description: `Réactive un étudiant qui était en perdition (enlève le statut dropout). Exemples: "réactive cet étudiant", "enlève la perdition de Marie"`,
    inputSchema: z.object({
      studentId: z.number().describe("L'ID de l'étudiant à réactiver")
    }),
    execute: reactivateStudent
  },
  transferStudent: {
    description: `Transfère un étudiant vers une autre promotion. Cherche d'abord l'étudiant pour obtenir son login. Exemples: "transfère Maxime de P1 vers P2", "change la promo de cet étudiant"`,
    inputSchema: z.object({
      studentLogin: z.string().describe("Le login de l'étudiant"),
      targetPromoName: z.string().describe("Le nom de la promotion cible"),
      reason: z.string().optional().describe("Raison du transfert")
    }),
    execute: transferStudent
  },
  markStudentAsAlternant: {
    description: `Marque un étudiant comme alternant avec les infos de l'entreprise. Cherche d'abord l'étudiant pour obtenir son ID. Exemples: "passe Marie en alternant chez Capgemini", "marque cet étudiant comme alternant"`,
    inputSchema: z.object({
      studentId: z.number().describe("L'ID de l'étudiant"),
      companyName: z.string().describe("Nom de l'entreprise"),
      companyContact: z.string().optional().describe("Nom du tuteur entreprise"),
      companyEmail: z.string().optional().describe("Email du tuteur"),
      startDate: z.string().optional().describe("Date de début (ISO)"),
      endDate: z.string().optional().describe("Date de fin (ISO)"),
      notes: z.string().optional().describe("Notes supplémentaires")
    }),
    execute: markStudentAsAlternant
  },
  removeAlternantStatus: {
    description: `Retire le statut alternant d'un étudiant. Exemples: "retire le statut alternant de Pierre", "il n'est plus alternant"`,
    inputSchema: z.object({
      studentId: z.number().describe("L'ID de l'étudiant")
    }),
    execute: removeAlternantStatus
  },
  resendAuditReminder: {
    description: `Renvoie un rappel Discord au capitaine d'un groupe en attente d'audit. Utilise d'abord getGroupsInAudit pour trouver le groupStatusId. Exemples: "renvoie le rappel au groupe", "re-notifie ce groupe"`,
    inputSchema: z.object({
      groupStatusId: z.number().describe("L'ID du group_status dans la table")
    }),
    execute: resendAuditReminder
  },
  triggerStudentUpdate: {
    description: `Déclenche une mise à jour des données étudiants depuis Zone01 pour une promotion. Utilise d'abord listAllPromos pour trouver le promoId. Exemples: "mets à jour les données de P1", "actualise la promo P2", "refresh les étudiants"`,
    inputSchema: z.object({
      promoEventId: z.string().describe("L'eventId/promoId de la promotion à mettre à jour")
    }),
    execute: triggerStudentUpdate
  },
  exportStudentsCsv: {
    description: `Génère un export CSV des étudiants. Peut filtrer par promo, statut et inclure/exclure les dropouts. Exemples: "exporte les étudiants en CSV", "export CSV des retardataires de P1", "/export"`,
    inputSchema: z.object({
      promoName: z.string().optional().describe("Filtrer par promotion"),
      status: z.string().optional().describe("Filtrer par statut (en retard, bien, en avance, Validé, Non Validé, spécialité)"),
      includeDropouts: z.boolean().optional().default(false).describe("Inclure les étudiants en perdition")
    }),
    execute: exportStudentsCsv
  }
};

export type NovaTools = typeof novaTools;
