import { withAdmin, withErrorHandler, apiSuccess, apiError } from '@/lib/api';
import { redrawParticipant } from '@/lib/db/services/coffeeDraws';

export const dynamic = 'force-dynamic';

/**
 * POST /api/coffee-draws/participants/[id] — re-tire ce seul participant
 * (le remplace par un apprenant éligible non déjà présent dans le tirage).
 */
export const POST = withErrorHandler(
  withAdmin<{ params: Promise<{ id: string }> }>(async (_req, ctx) => {
    const { id } = await ctx.params;
    const participantId = Number(id);
    if (!Number.isInteger(participantId)) {
      return apiError('BAD_REQUEST', 'Participant invalide');
    }

    const result = await redrawParticipant(participantId);
    if (!result.ok) {
      if (result.reason === 'not_found') {
        return apiError('NOT_FOUND', 'Participant introuvable');
      }
      return apiError('CONFLICT', 'Plus aucun apprenant éligible à tirer');
    }
    return apiSuccess({ draw: result.draw });
  }),
);
