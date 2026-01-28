import { NextResponse } from 'next/server';
import { db } from '@/lib/db/config';
import { students, studentProjects, studentSpecialtyProgress } from '@/lib/db/schema';
import { audits, auditResults } from '@/lib/db/schema/audits';
import { eq, and, or, sql, desc } from 'drizzle-orm';
import type { Alert } from '@/lib/types/alerts';
import promoConfig from '../../../config/promoConfig.json';

/**
 * Helper to safely get warnings array from JSONB field
 * Handles: arrays, JSON strings, null, undefined
 */
function getWarningsArray(warnings: unknown): string[] {
  if (Array.isArray(warnings)) {
    return warnings;
  }
  if (typeof warnings === 'string') {
    try {
      const parsed = JSON.parse(warnings);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Not valid JSON, return empty
    }
  }
  return [];
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const promoFilter = url.searchParams.get('promo');

    const alerts: Alert[] = [];

    // Exclure les étudiants en perdition de toutes les requêtes
    const notDropoutCondition = eq(students.isDropout, false);

    // Exécuter toutes les requêtes en parallèle
    const [lateStudents, withoutGroupStudents, notValidatedStudents, incompleteTracksStudents, recentAudits] = await Promise.all([
      // 1. Étudiants en retard critique (hors perditions)
      db
        .select({
          id: students.id,
          firstName: students.first_name,
          lastName: students.last_name,
          promoName: students.promoName,
          delay_level: studentProjects.delay_level,
        })
        .from(students)
        .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
        .where(
          and(
            notDropoutCondition,
            eq(studentProjects.delay_level, 'en retard'),
            promoFilter ? eq(students.promoName, promoFilter) : sql`true`
          )
        )
        .execute(),

      // 2. Étudiants sans groupe (hors perditions)
      db
        .select({
          id: students.id,
          firstName: students.first_name,
          lastName: students.last_name,
          promoName: students.promoName,
        })
        .from(students)
        .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
        .where(
          and(
            notDropoutCondition,
            eq(studentProjects.progress_status, 'without group'),
            promoFilter ? eq(students.promoName, promoFilter) : sql`true`
          )
        )
        .execute(),

      // 3. Étudiants non validés (hors perditions)
      db
        .select({
          id: students.id,
          firstName: students.first_name,
          lastName: students.last_name,
          promoName: students.promoName,
        })
        .from(students)
        .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
        .where(
          and(
            notDropoutCondition,
            eq(studentProjects.delay_level, 'Non Validé'),
            promoFilter ? eq(students.promoName, promoFilter) : sql`true`
          )
        )
        .execute(),

      // 4. Étudiants bloqués sur un tronc (hors perditions)
      db
        .select({
          id: students.id,
          firstName: students.first_name,
          lastName: students.last_name,
          promoName: students.promoName,
          golang_completed: studentSpecialtyProgress.golang_completed,
          javascript_completed: studentSpecialtyProgress.javascript_completed,
          rust_completed: studentSpecialtyProgress.rust_completed,
          java_completed: studentSpecialtyProgress.java_completed,
        })
        .from(students)
        .leftJoin(studentSpecialtyProgress, eq(students.id, studentSpecialtyProgress.student_id))
        .where(
          and(
            notDropoutCondition,
            or(
              eq(studentSpecialtyProgress.golang_completed, false),
              eq(studentSpecialtyProgress.javascript_completed, false)
            ),
            promoFilter ? eq(students.promoName, promoFilter) : sql`true`
          )
        )
        .execute(),

      // 5. Tous les audits récents (filtrage warnings/validation côté JS)
      db.query.audits.findMany({
        where: promoFilter ? eq(audits.promoId, promoFilter) : undefined,
        orderBy: [desc(audits.createdAt)],
        limit: 50,
        with: { results: true }
      })
    ]);

    // Traitement des résultats
    lateStudents.forEach((student) => {
      alerts.push({
        id: `late-${student.id}`,
        type: 'danger',
        severity: 'high',
        title: 'Étudiant en retard',
        description: `${student.firstName} ${student.lastName} est en retard sur le projet attendu`,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        promoKey: student.promoName,
        action: 'Contacter l\'étudiant',
      });
    });

    withoutGroupStudents.forEach((student) => {
      alerts.push({
        id: `without-group-${student.id}`,
        type: 'warning',
        severity: 'medium',
        title: 'Étudiant sans groupe',
        description: `${student.firstName} ${student.lastName} n'a pas de groupe de travail`,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        promoKey: student.promoName,
        action: 'Assigner à un groupe',
      });
    });

    notValidatedStudents.forEach((student) => {
      alerts.push({
        id: `not-validated-${student.id}`,
        type: 'danger',
        severity: 'critical',
        title: 'Formation non validée',
        description: `${student.firstName} ${student.lastName} n'a pas validé sa formation`,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        promoKey: student.promoName,
        action: 'Revoir le parcours',
      });
    });

    // Créer des alertes agrégées par tronc incomplet
    const trackCounts: Record<string, { count: number; students: string[] }> = {
      golang: { count: 0, students: [] },
      javascript: { count: 0, students: [] },
    };

    incompleteTracksStudents.forEach((student) => {
      if (!student.golang_completed) {
        trackCounts.golang.count++;
        trackCounts.golang.students.push(`${student.firstName} ${student.lastName}`);
      }
      if (!student.javascript_completed) {
        trackCounts.javascript.count++;
        trackCounts.javascript.students.push(`${student.firstName} ${student.lastName}`);
      }
    });

    Object.entries(trackCounts).forEach(([track, data]) => {
      if (data.count > 0) {
        alerts.push({
          id: `incomplete-track-${track}`,
          type: 'info',
          severity: 'low',
          title: `Tronc ${track} incomplet`,
          description: `${data.count} étudiant(s) n'ont pas terminé le tronc ${track}`,
          count: data.count,
          action: 'Vérifier la progression',
        });
      }
    });

    // Traitement des audits - filtrage côté JavaScript pour éviter les erreurs SQL
    const processedAuditIds = new Set<number>();

    recentAudits.forEach((audit) => {
      if (processedAuditIds.has(audit.id)) return;

      const promo = (promoConfig as any[]).find(p => String(p.eventId) === audit.promoId);
      const promoName = promo?.key ?? `Promo ${audit.promoId}`;

      // Calculer warnings de manière sécurisée (gère arrays, JSON strings, null)
      const globalWarningsArr = getWarningsArray(audit.warnings);
      const memberWarningsCount = audit.results.reduce((sum, r) => {
        return sum + getWarningsArray(r.warnings).length;
      }, 0);
      const totalWarnings = globalWarningsArr.length + memberWarningsCount;

      // Audits avec warnings
      if (totalWarnings > 0) {
        processedAuditIds.add(audit.id);
        alerts.push({
          id: `audit-warning-${audit.id}`,
          type: 'warning',
          severity: totalWarnings > 2 ? 'high' : 'medium',
          title: `Code Review avec warnings`,
          description: `${audit.projectName} (${audit.groupId}) - ${totalWarnings} warning(s) détecté(s)`,
          promoKey: promoName,
          count: totalWarnings,
          action: 'Voir l\'audit',
        });
        return;
      }

      // Audits avec faible validation
      const totalMembers = audit.totalMembers ?? audit.results.length;
      const validatedCount = audit.validatedCount ?? audit.results.filter(r => r.validated).length;
      const validationRate = totalMembers > 0
        ? Math.round((validatedCount / totalMembers) * 100)
        : 100;

      if (validationRate < 50 && totalMembers > 0) {
        processedAuditIds.add(audit.id);
        alerts.push({
          id: `audit-lowval-${audit.id}`,
          type: 'danger',
          severity: validationRate < 30 ? 'critical' : 'high',
          title: `Faible taux de validation`,
          description: `${audit.projectName} (${audit.groupId}) - ${validationRate}% validé (${validatedCount}/${totalMembers})`,
          promoKey: promoName,
          action: 'Voir l\'audit',
        });
      }
    });

    // 5. Alertes de statistiques globales
    if (!promoFilter) {
      const totalLate = lateStudents.length;
      const totalWithoutGroup = withoutGroupStudents.length;
      const totalNotValidated = notValidatedStudents.length;

      if (totalLate > 5) {
        alerts.push({
          id: 'stat-late',
          type: 'warning',
          severity: 'high',
          title: 'Taux de retard élevé',
          description: `${totalLate} étudiants sont actuellement en retard`,
          count: totalLate,
          action: 'Analyser les causes',
        });
      }

      if (totalWithoutGroup > 0) {
        alerts.push({
          id: 'stat-without-group',
          type: 'warning',
          severity: 'medium',
          title: 'Étudiants sans groupe',
          description: `${totalWithoutGroup} étudiants n'ont pas de groupe de travail`,
          count: totalWithoutGroup,
          action: 'Organiser des groupes',
        });
      }

      if (totalNotValidated > 0) {
        alerts.push({
          id: 'stat-not-validated',
          type: 'danger',
          severity: 'critical',
          title: 'Formations non validées',
          description: `${totalNotValidated} étudiants n'ont pas validé leur formation`,
          count: totalNotValidated,
          action: 'Contacter les étudiants',
        });
      }
    }

    // Trier par sévérité
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return NextResponse.json({
      success: true,
      alerts,
      summary: {
        total: alerts.length,
        critical: alerts.filter((a) => a.severity === 'critical').length,
        high: alerts.filter((a) => a.severity === 'high').length,
        medium: alerts.filter((a) => a.severity === 'medium').length,
        low: alerts.filter((a) => a.severity === 'low').length,
      },
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}
