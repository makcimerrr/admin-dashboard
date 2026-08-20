import type { NextRequest } from 'next/server';
import { withAdmin, withErrorHandler, apiSuccess, apiError } from '@/lib/api';
import { getCandidateDetail } from '@/lib/db/services/piscines';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/piscines/candidates/[id] — fiche candidat : épreuve par épreuve. */
export const GET = withErrorHandler(
  withAdmin<Ctx>(async (_req: NextRequest, { params }) => {
    const candidate = await getCandidateDetail(Number((await params).id));
    if (!candidate) return apiError('NOT_FOUND', 'Candidat introuvable');
    return apiSuccess({ candidate });
  }),
);
