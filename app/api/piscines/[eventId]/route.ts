import type { NextRequest } from 'next/server';
import { withAdmin, withErrorHandler, apiSuccess } from '@/lib/api';
import {
  getSessionCandidates,
  getSessionExams,
  getSessionStats,
} from '@/lib/db/services/piscines';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ eventId: string }> };

/**
 * GET /api/piscines/[eventId] — candidats d'une session, repères chiffrés, et
 * la liste ordonnée de ses examens (une colonne de tableau chacun).
 */
export const GET = withErrorHandler(
  withAdmin<Ctx>(async (_req: NextRequest, { params }) => {
    const eventId = Number((await params).eventId);
    const [candidates, stats, exams] = await Promise.all([
      getSessionCandidates(eventId),
      getSessionStats(eventId),
      // Les examens varient d'une session à l'autre : les colonnes du tableau
      // sont construites à partir de cette liste, pas d'une constante.
      getSessionExams(eventId),
    ]);
    return apiSuccess({ candidates, stats, exams });
  }),
);
