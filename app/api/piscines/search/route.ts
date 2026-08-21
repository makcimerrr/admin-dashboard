import type { NextRequest } from 'next/server';
import { withAdmin, withErrorHandler, apiSuccess } from '@/lib/api';
import { searchCandidates } from '@/lib/db/services/piscines';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/piscines/search?q=… — retrouve un candidat dans TOUTES les sessions.
 *
 * Répond à « où est passé Maxime Dubois ? » sans qu'on ait à savoir dans quelle
 * piscine il se trouvait : chaque résultat porte sa session, l'UI y bascule.
 */
export const GET = withErrorHandler(
  withAdmin(async (req: NextRequest) => {
    const q = new URL(req.url).searchParams.get('q') ?? '';
    return apiSuccess({ matches: await searchCandidates(q) });
  }),
);
