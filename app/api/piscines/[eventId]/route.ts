import type { NextRequest } from 'next/server';
import { withAdmin, withErrorHandler, apiSuccess } from '@/lib/api';
import { getSessionCandidates, getSessionStats } from '@/lib/db/services/piscines';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ eventId: string }> };

/** GET /api/piscines/[eventId] — candidats d'une session + repères chiffrés. */
export const GET = withErrorHandler(
  withAdmin<Ctx>(async (_req: NextRequest, { params }) => {
    const eventId = Number((await params).eventId);
    const [candidates, stats] = await Promise.all([
      getSessionCandidates(eventId),
      getSessionStats(eventId),
    ]);
    return apiSuccess({ candidates, stats });
  }),
);
