import { withAdmin, withErrorHandler, apiSuccess, apiError } from '@/lib/api';
import { syncEmargementStatuses } from '@/lib/db/services/emargementSync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/emargement/sync — déclenche à la demande (admin) la synchro des
 * statuts apprenants depuis émargement (archivé + alternant). SENS UNIQUE :
 * émargement en lecture seule, seul le hub est écrit.
 */
export const POST = withErrorHandler(
  withAdmin(async () => {
    try {
      const result = await syncEmargementStatuses();
      return apiSuccess(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Sync émargement échouée';
      if (message.includes('non configuré')) {
        return apiError('BAD_REQUEST', 'EMARGEMENT_DATABASE_URL non configuré côté serveur');
      }
      throw e;
    }
  }),
);
