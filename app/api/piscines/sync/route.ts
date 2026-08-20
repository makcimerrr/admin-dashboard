import { withAdmin, withErrorHandler, apiSuccess, apiError } from '@/lib/api';
import { syncPiscines } from '@/lib/db/services/piscines';
import { isZone01Configured } from '@/lib/services/zone01-graphql';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * POST /api/piscines/sync — synchro à la demande depuis Zone01.
 *
 * Idempotente : rejouable sans risque. Le cron fait la même chose toutes les
 * 4 h ; ce bouton sert à rafraîchir avant une réunion, un jour d'examen.
 */
export const POST = withErrorHandler(
  withAdmin(async () => {
    if (!isZone01Configured()) {
      return apiError('BAD_REQUEST', 'ACCESS_TOKEN Zone01 non configuré côté serveur');
    }
    return apiSuccess(await syncPiscines());
  }),
);
