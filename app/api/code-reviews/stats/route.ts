import { db } from '@/lib/db/config';
import { audits, auditResults } from '@/lib/db/schema/audits';
import { promotions } from '@/lib/db/schema/promotions';
import { count, eq, notInArray, or, isNull } from 'drizzle-orm';
import { apiSuccess, withAuth, withErrorHandler } from '@/lib/api';
import { getArchivedPromoNames } from '@/lib/db/filters';

async function computeStats() {
  // Audits use promoId (the event/promotion id, stored as text). We need to
  // exclude audits whose promo is currently archived.
  const archivedRows = await db
    .select({ promoId: promotions.promoId })
    .from(promotions)
    .where(eq(promotions.isArchived, true));
  const archivedIds = archivedRows.map((r) => r.promoId);
  const notArchived = archivedIds.length > 0 ? notInArray(audits.promoId, archivedIds) : undefined;

  const [auditsCount] = await db
    .select({ count: count() })
    .from(audits)
    .where(notArchived ?? or(isNull(audits.promoId)));

  const [resultsCount] = await db
    .select({ count: count() })
    .from(auditResults);

  const sampleResults = await db.query.auditResults.findMany({
    limit: 15,
    with: { audit: true },
  });

  const allAudits = await db.query.audits.findMany();
  const archivedSet = new Set(archivedIds);
  const byPromo: Record<string, number> = {};
  const byTrack: Record<string, number> = {};
  const byAuditor: Record<string, number> = {};

  for (const a of allAudits) {
    if (archivedSet.has(a.promoId)) continue;
    byPromo[a.promoId] = (byPromo[a.promoId] || 0) + 1;
    byTrack[a.track] = (byTrack[a.track] || 0) + 1;
    byAuditor[a.auditorName] = (byAuditor[a.auditorName] || 0) + 1;
  }

  return {
    totalAudits: auditsCount.count,
    totalStudentResults: resultsCount.count,
    byPromo,
    byTrack,
    byAuditor,
    sampleStudents: sampleResults
      .filter((r) => r.audit && !archivedSet.has(r.audit.promoId))
      .map((r) => ({
        login: r.studentLogin,
        validated: r.validated,
        project: r.audit?.projectName,
        track: r.audit?.track,
      })),
  };
}

export const GET = withErrorHandler(
  withAuth(async () => {
    // Note: not using unstable_cache here because the filter depends on
    // mutable archive state. The query itself is light enough (3 small reads).
    // Touch the cache helper just so it's still imported if needed elsewhere.
    await getArchivedPromoNames();
    const data = await computeStats();
    return apiSuccess(data);
  }),
);
