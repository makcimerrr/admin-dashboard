import type { NextRequest } from 'next/server';
import { withAdmin, withErrorHandler, apiSuccess, apiError } from '@/lib/api';
import { deleteFollowUpReport, updateFollowUpReport } from '@/lib/db/services/followUps';
import { FOLLOW_UP_MODES } from '@/lib/db/schema/followUps';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/follow-ups/reports/[id] — correction d'un compte rendu. */
export const PATCH = withErrorHandler(
  withAdmin<Ctx>(async (req: NextRequest, { params }) => {
    const id = Number((await params).id);
    const body = (await req.json()) as {
      performedAt?: string;
      content?: string;
      mode?: string;
      vigilancePoints?: string;
      documentId?: number | null;
    };

    if (body.mode && !(FOLLOW_UP_MODES as readonly string[]).includes(body.mode)) {
      return apiError('BAD_REQUEST', `mode invalide (${FOLLOW_UP_MODES.join(', ')})`);
    }

    const updated = await updateFollowUpReport(id, {
      ...(body.performedAt ? { performedAt: new Date(body.performedAt) } : {}),
      ...(body.content !== undefined ? { content: body.content } : {}),
      ...(body.mode !== undefined ? { mode: body.mode } : {}),
      ...(body.vigilancePoints !== undefined ? { vigilancePoints: body.vigilancePoints } : {}),
      ...(body.documentId !== undefined ? { documentId: body.documentId } : {}),
    });

    if (!updated) return apiError('NOT_FOUND', 'Compte rendu introuvable');
    return apiSuccess({ report: updated });
  }),
);

/**
 * DELETE /api/follow-ups/reports/[id].
 *
 * L'échéance associée n'est PAS rouverte automatiquement : la repasser à
 * « à venir » se fait explicitement via PATCH /api/follow-ups/[id].
 */
export const DELETE = withErrorHandler(
  withAdmin<Ctx>(async (_req: NextRequest, { params }) => {
    const ok = await deleteFollowUpReport(Number((await params).id));
    if (!ok) return apiError('NOT_FOUND', 'Compte rendu introuvable');
    return apiSuccess({ deleted: true });
  }),
);
