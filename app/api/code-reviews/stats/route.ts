import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db/config';
import { audits, auditResults } from '@/lib/db/schema/audits';
import { count } from 'drizzle-orm';
import { apiSuccess, withAuth, withErrorHandler } from '@/lib/api';
import { CACHE_TAGS, CACHE_TTL } from '@/lib/cache';

const computeStats = unstable_cache(
  async () => {
    const [auditsCount] = await db.select({ count: count() }).from(audits);
    const [resultsCount] = await db.select({ count: count() }).from(auditResults);

    const sampleResults = await db.query.auditResults.findMany({
      limit: 15,
      with: { audit: true },
    });

    const allAudits = await db.query.audits.findMany();
    const byPromo: Record<string, number> = {};
    const byTrack: Record<string, number> = {};
    const byAuditor: Record<string, number> = {};

    for (const a of allAudits) {
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
      sampleStudents: sampleResults.map((r) => ({
        login: r.studentLogin,
        validated: r.validated,
        project: r.audit?.projectName,
        track: r.audit?.track,
      })),
    };
  },
  ['code-reviews-stats'],
  { tags: [CACHE_TAGS.codeReviewsStats], revalidate: CACHE_TTL.medium },
);

export const GET = withErrorHandler(
  withAuth(async () => {
    const data = await computeStats();
    return apiSuccess(data);
  }),
);
