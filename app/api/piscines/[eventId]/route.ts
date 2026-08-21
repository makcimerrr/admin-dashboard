import type { NextRequest } from 'next/server';
import { withAdmin, withErrorHandler, apiSuccess } from '@/lib/api';
import {
  getSessionCandidates,
  getSessionExams,
  getSessionProjects,
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
    const [candidates, stats, exams, projects] = await Promise.all([
      getSessionCandidates(eventId),
      getSessionStats(eventId),
      // Grille standard (4 examens, 3 projets) enrichie de ce que la session
      // contient réellement : les colonnes restent les mêmes d'une session à
      // l'autre, une épreuve non tenue se lit au lieu de disparaître.
      getSessionExams(eventId),
      getSessionProjects(eventId),
    ]);
    return apiSuccess({ candidates, stats, exams, projects });
  }),
);
