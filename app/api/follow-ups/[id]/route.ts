import type { NextRequest } from 'next/server';
import { withAdmin, withErrorHandler, apiSuccess, apiError } from '@/lib/api';
import {
  getMilestoneById,
  getRemindersForMilestone,
  setMilestoneStatus,
} from '@/lib/db/services/followUps';
import { MILESTONE_STATUSES, type MilestoneStatus } from '@/lib/db/schema/followUps';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/follow-ups/[id] — détail d'une échéance + historique de ses relances. */
export const GET = withErrorHandler(
  withAdmin<Ctx>(async (_req: NextRequest, { params }) => {
    const id = Number((await params).id);
    const milestone = await getMilestoneById(id);
    if (!milestone) return apiError('NOT_FOUND', 'Échéance introuvable');
    const reminders = await getRemindersForMilestone(id);
    return apiSuccess({ milestone, reminders });
  }),
);

/**
 * PATCH /api/follow-ups/[id] — change le statut d'une échéance.
 * Body : { status, scheduledAt?, notes?, cancelReason? }
 *
 * Le passage en `realise` se fait normalement par la saisie d'un compte rendu
 * (POST /api/follow-ups/reports) ; on l'autorise ici pour les cas de
 * régularisation d'un suivi ancien.
 */
export const PATCH = withErrorHandler(
  withAdmin<Ctx>(async (req: NextRequest, { params }) => {
    const id = Number((await params).id);
    const body = (await req.json()) as {
      status?: string;
      scheduledAt?: string | null;
      notes?: string;
      cancelReason?: string;
    };

    if (!body.status || !(MILESTONE_STATUSES as readonly string[]).includes(body.status)) {
      return apiError(
        'BAD_REQUEST',
        `status requis parmi : ${MILESTONE_STATUSES.join(', ')}`,
      );
    }

    const updated = await setMilestoneStatus(id, body.status as MilestoneStatus, {
      ...(body.scheduledAt !== undefined
        ? { scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null }
        : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.cancelReason !== undefined ? { cancelReason: body.cancelReason } : {}),
    });

    if (!updated) return apiError('NOT_FOUND', 'Échéance introuvable');
    return apiSuccess({ milestone: updated });
  }),
);
