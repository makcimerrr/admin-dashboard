import { withAdmin, withErrorHandler, apiSuccess } from '@/lib/api';
import { createCoffeeDraw, getLatestCoffeeDraw } from '@/lib/db/services/coffeeDraws';

export const dynamic = 'force-dynamic';

/** GET /api/coffee-draws — dernier tirage café (avec participants). */
export const GET = withErrorHandler(
  withAdmin(async () => {
    const draw = await getLatestCoffeeDraw();
    return apiSuccess({ draw });
  }),
);

/**
 * POST /api/coffee-draws — lance un nouveau tirage (9–10 apprenants actifs,
 * toutes promos). Body `{ includeAlternants?: boolean }` (défaut true) contrôle
 * l'inclusion des alternants. Phase de test : pas d'envoi Discord.
 */
export const POST = withErrorHandler(
  withAdmin(async (req) => {
    const body = await req.json().catch(() => ({}));
    const includeAlternants = body?.includeAlternants !== false; // défaut true
    const draw = await createCoffeeDraw({ includeAlternants });
    return apiSuccess({ draw });
  }),
);
