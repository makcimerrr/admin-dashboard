import { eq, and } from 'drizzle-orm';
import { db } from '../config';
import { specialtyTracking, type SpecialtyProject } from '../schema/specialtyTracking';
import { fetchPromotionProgressions } from '@/lib/services/zone01';
import { SPECIALTIES, type SpecialtyKey } from '@/lib/specialties';

// ─── Queries ────────────────────────────────────────────────────────────────

export async function getSpecialtyStudents(specialty: string, promoId?: string) {
  const conditions = [eq(specialtyTracking.specialty, specialty)];
  if (promoId) conditions.push(eq(specialtyTracking.promoId, promoId));

  return db
    .select()
    .from(specialtyTracking)
    .where(and(...conditions))
    .orderBy(specialtyTracking.login);
}

export async function getAllSpecialtyRows() {
  return db.select().from(specialtyTracking);
}

// ─── Sync from Zone01 API ───────────────────────────────────────────────────

/**
 * Synchronise la table specialty_tracking depuis l'API Zone01 pour une promo.
 * Pour chaque étudiant ayant au moins un projet dans une spécialité,
 * on upsert une ligne avec sa progression.
 */
export async function syncSpecialtyTracking(promoId: string) {
  const progressions = await fetchPromotionProgressions(promoId);

  // Build a map: login → { user, projects: Map<projectName, { grade, status }> }
  const studentMap = new Map<string, {
    firstName?: string;
    lastName?: string;
    projects: Map<string, { grade: number | null; status: string }>;
  }>();

  for (const p of progressions) {
    let student = studentMap.get(p.user.login);
    if (!student) {
      student = {
        firstName: p.user.firstName,
        lastName: p.user.lastName,
        projects: new Map(),
      };
      studentMap.set(p.user.login, student);
    }
    // Keep the best status per project (finished > in_progress/audit/setup > failed)
    const existing = student.projects.get(p.object.name.toLowerCase());
    const newStatus = p.group.status;
    if (!existing || statusPriority(newStatus) > statusPriority(existing.status)) {
      student.projects.set(p.object.name.toLowerCase(), {
        grade: p.grade ?? null,
        status: newStatus,
      });
    }
  }

  let upsertCount = 0;

  // For each specialty, compute per-student progression
  for (const [specKey, specDef] of Object.entries(SPECIALTIES)) {
    const projectNamesLower = specDef.projects.map((p) => p.toLowerCase());

    for (const [login, student] of studentMap) {
      // Check if student has any project in this specialty
      const projectStatuses: SpecialtyProject[] = [];
      let completedCount = 0;
      let currentProject: string | null = null;

      for (const projName of specDef.projects) {
        const entry = student.projects.get(projName.toLowerCase());
        if (entry) {
          const isFinished = entry.status === 'finished';
          const isWorking = ['in_progress', 'setup', 'audit'].includes(entry.status);
          projectStatuses.push({
            name: projName,
            grade: entry.grade,
            status: isFinished ? 'finished' : 'working',
          });
          if (isFinished) completedCount++;
          if (isWorking && !currentProject) currentProject = projName;
        } else {
          projectStatuses.push({ name: projName, grade: null, status: 'not_started' });
        }
      }

      // Only store if student has at least one project started in this specialty
      const hasStarted = projectStatuses.some((p) => p.status !== 'not_started');
      if (!hasStarted) continue;

      // Upsert
      const existing = await db
        .select()
        .from(specialtyTracking)
        .where(
          and(
            eq(specialtyTracking.login, login),
            eq(specialtyTracking.specialty, specKey),
            eq(specialtyTracking.promoId, promoId)
          )
        )
        .limit(1);

      const row = {
        login,
        firstName: student.firstName || null,
        lastName: student.lastName || null,
        specialty: specKey,
        promoId,
        projects: projectStatuses,
        completedCount,
        totalCount: specDef.projects.length,
        currentProject,
        updatedAt: new Date(),
      };

      if (existing.length > 0) {
        await db
          .update(specialtyTracking)
          .set(row)
          .where(eq(specialtyTracking.id, existing[0].id));
      } else {
        await db.insert(specialtyTracking).values(row);
      }
      upsertCount++;
    }
  }

  return { upsertCount };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function statusPriority(status: string): number {
  switch (status) {
    case 'finished': return 3;
    case 'audit': return 2;
    case 'in_progress': return 2;
    case 'setup': return 1;
    case 'failed': return 0;
    default: return -1;
  }
}
