import type { NextRequest } from 'next/server';
import { withAdmin, withErrorHandler, apiSuccess } from '@/lib/api';
import { deactivateMilestoneType, reconcileMilestones } from '@/lib/db/services/followUps';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Ctx = { params: Promise<{ code: string }> };

/**
 * DELETE /api/follow-ups/milestone-types/[code] — DÉSACTIVE le jalon.
 *
 * Jamais de suppression physique : les échéances déjà posées et les comptes
 * rendus qui y sont rattachés doivent rester consultables (traçabilité
 * Qualiopi). Les échéances non réalisées de ce jalon passent en « annulé ».
 */
export const DELETE = withErrorHandler(
  withAdmin<Ctx>(async (_req: NextRequest, { params }) => {
    const code = (await params).code;
    await deactivateMilestoneType(code);
    const reconciled = await reconcileMilestones();
    return apiSuccess({ deactivated: code, reconciled });
  }),
);
