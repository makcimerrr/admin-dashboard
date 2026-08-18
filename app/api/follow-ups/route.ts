import type { NextRequest } from 'next/server';
import { withAdmin, withErrorHandler, apiSuccess } from '@/lib/api';
import {
  getFollowUpStats,
  listMilestones,
  type MilestoneFilters,
} from '@/lib/db/services/followUps';
import { MILESTONE_STATUSES, type MilestoneStatus } from '@/lib/db/schema/followUps';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/follow-ups — échéances de suivi en entreprise.
 *
 * Query :
 *   - status=a_venir,relance_envoyee   (filtre multi-statuts)
 *   - studentId=42
 *   - company=Acme
 *   - includeClosed=true               (inclut réalisé/annulé)
 *   - stats=true                       (renvoie uniquement le bandeau de stats)
 *
 * Admin-only : contient les coordonnées des tuteurs entreprise.
 */
export const GET = withErrorHandler(
  withAdmin(async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);

    if (searchParams.get('stats') === 'true') {
      return apiSuccess({ stats: await getFollowUpStats() });
    }

    const statusParam = searchParams.get('status');
    const status = statusParam
      ? (statusParam
          .split(',')
          .map((s) => s.trim())
          .filter((s): s is MilestoneStatus =>
            (MILESTONE_STATUSES as readonly string[]).includes(s),
          ) as MilestoneStatus[])
      : undefined;

    const studentIdParam = searchParams.get('studentId');
    const filters: MilestoneFilters = {
      ...(status?.length ? { status } : {}),
      ...(studentIdParam ? { studentId: Number(studentIdParam) } : {}),
      ...(searchParams.get('company') ? { company: searchParams.get('company')! } : {}),
      includeClosed: searchParams.get('includeClosed') === 'true',
    };

    const milestones = await listMilestones(filters);
    return apiSuccess({ milestones, count: milestones.length });
  }),
);
