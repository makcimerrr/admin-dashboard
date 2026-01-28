import { NextResponse } from 'next/server';
import { db } from '@/lib/db/config';
import { audits } from '@/lib/db/schema/audits';
import { desc } from 'drizzle-orm';
import promoConfig from '../../../../config/promoConfig.json';

/**
 * Helper to safely get warnings array from JSONB field
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
      // Not valid JSON
    }
  }
  return [];
}

/**
 * GET /api/code-reviews/all
 * Récupère tous les audits de toutes les promotions
 */
export async function GET() {
  try {
    const allAudits = await db.query.audits.findMany({
      orderBy: [desc(audits.createdAt)],
      with: {
        results: true
      }
    });

    const formattedAudits = allAudits.map((audit) => {
      const promo = (promoConfig as any[]).find(
        (p) => String(p.eventId) === String(audit.promoId)
      );
      const promoName = promo?.key ?? `Promo ${audit.promoId}`;

      const globalWarningsArr = getWarningsArray(audit.warnings);
      const memberWarningsCount = audit.results.reduce(
        (sum, r) => sum + getWarningsArray(r.warnings).length,
        0
      );
      const warningsCount = globalWarningsArr.length + memberWarningsCount;
      const hasWarnings = warningsCount > 0;

      // Calculer la priorité
      const validationRate =
        audit.totalMembers && audit.totalMembers > 0
          ? (audit.validatedCount || 0) / audit.totalMembers
          : 1;

      let priority: 'urgent' | 'warning' | 'normal' = audit.priority as any || 'normal';
      if (hasWarnings || validationRate < 0.3) {
        priority = 'urgent';
      } else if (validationRate < 0.5) {
        priority = 'warning';
      }

      // Détails des membres avec statut de validation
      const memberDetails = audit.results.map((r) => ({
        login: r.studentLogin,
        validated: r.validated,
        hasWarnings: getWarningsArray(r.warnings).length > 0,
        warningsCount: getWarningsArray(r.warnings).length,
        warnings: getWarningsArray(r.warnings)
      }));

      return {
        id: audit.id,
        promoId: audit.promoId,
        promoName,
        projectName: audit.projectName,
        track: audit.track,
        groupId: audit.groupId,
        auditorName: audit.auditorName,
        createdAt: audit.createdAt.toISOString(),
        updatedAt: audit.updatedAt?.toISOString(),
        priority,
        validatedCount: audit.validatedCount || 0,
        totalMembers: audit.totalMembers || 0,
        hasWarnings,
        warningsCount,
        globalWarnings: globalWarningsArr,
        members: audit.results.map((r) => r.studentLogin),
        memberDetails,
        summary: audit.summary
      };
    });

    return NextResponse.json({
      success: true,
      audits: formattedAudits,
      total: formattedAudits.length
    });
  } catch (error) {
    console.error('Error fetching all audits:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du chargement des audits' },
      { status: 500 }
    );
  }
}
