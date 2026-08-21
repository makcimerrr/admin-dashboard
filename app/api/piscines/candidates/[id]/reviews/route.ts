import type { NextRequest } from 'next/server';
import { withAdmin, withErrorHandler, apiSuccess, apiError } from '@/lib/api';
import {
  getCandidateDetail,
  saveCandidateComment,
  saveProjectReview,
} from '@/lib/db/services/piscines';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * PUT /api/piscines/candidates/[id]/reviews — saisie humaine sur un candidat.
 *
 * Body : { comment } et/ou { project, content }.
 *
 * Ces données vivent hors du miroir Zone01 : la synchro réécrit les résultats,
 * elle ne touche jamais aux commentaires ni aux comptes rendus.
 */
export const PUT = withErrorHandler(
  withAdmin<Ctx>(async (req: NextRequest, { params, user }) => {
    const candidateId = Number((await params).id);
    const body = (await req.json()) as {
      comment?: string;
      project?: string;
      content?: string;
    };

    const author = user.name || user.email;

    try {
      if (body.comment !== undefined) {
        await saveCandidateComment(candidateId, body.comment, author);
      }
      if (body.project !== undefined) {
        await saveProjectReview(candidateId, body.project, body.content ?? '', author);
      }
    } catch (e) {
      return apiError('BAD_REQUEST', e instanceof Error ? e.message : 'Saisie invalide');
    }

    const candidate = await getCandidateDetail(candidateId);
    if (!candidate) return apiError('NOT_FOUND', 'Candidat introuvable');
    return apiSuccess({ candidate });
  }),
);
