import { withAdmin, withErrorHandler, apiSuccess } from '@/lib/api';
import { reconcileMilestones } from '@/lib/db/services/followUps';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/follow-ups/reconcile — recalcule les échéances de TOUS les contrats.
 *
 * Idempotent : à utiliser après un import Notion, une correction de dates, ou
 * simplement pour vérifier que rien ne manque. Le cron quotidien fait la même
 * chose automatiquement.
 */
export const POST = withErrorHandler(
  withAdmin(async () => {
    return apiSuccess(await reconcileMilestones());
  }),
);
