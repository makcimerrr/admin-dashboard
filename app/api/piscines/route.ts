import { withAdmin, withErrorHandler, apiSuccess } from '@/lib/api';
import { listPiscineSessions } from '@/lib/db/services/piscines';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/piscines — sessions de piscine de sélection, de la plus récente à la
 * plus ancienne. C'est l'entrée du module : on choisit d'abord une session.
 *
 * Admin-only : ces données nominatives concernent des candidats, dont la
 * plupart n'intégreront pas l'école.
 */
export const GET = withErrorHandler(
  withAdmin(async () => {
    return apiSuccess({ sessions: await listPiscineSessions() });
  }),
);
