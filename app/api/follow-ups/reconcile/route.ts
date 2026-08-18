import { withAdmin, withErrorHandler, apiSuccess } from '@/lib/api';
import {
  linkOrphanReportsToMilestones,
  reconcileMilestones,
} from '@/lib/db/services/followUps';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/follow-ups/reconcile — recalcule les échéances de TOUS les contrats
 * et rattache les comptes rendus orphelins à l'échéance qu'ils clôturent.
 *
 * Idempotent : à utiliser après un import Notion, une correction de dates, ou
 * simplement pour vérifier que rien ne manque. Le cron quotidien fait la même
 * chose automatiquement.
 */
export const POST = withErrorHandler(
  withAdmin(async () => {
    const reconciled = await reconcileMilestones();
    const linkedReports = await linkOrphanReportsToMilestones();
    return apiSuccess({ ...reconciled, linkedReports });
  }),
);
