import type { NextRequest } from 'next/server';
import { getHackatonWeek, setHackatonWeek } from '@/lib/db/services/planning';
import { apiError, apiSuccess, withAuth, withErrorHandler } from '@/lib/api';

export const GET = withErrorHandler(
  withAuth(async (req: NextRequest) => {
    const weekKey = req.nextUrl.searchParams.get('weekKey');
    if (!weekKey) return apiError('BAD_REQUEST', 'weekKey requis');
    const result = await getHackatonWeek(weekKey);
    return apiSuccess({ weekKey, isHackaton: !!(result && result.isHackaton) });
  }),
);

export const POST = withErrorHandler(
  withAuth(async (req: NextRequest) => {
    const { weekKey, isHackaton } = await req.json();
    if (!weekKey || typeof isHackaton !== 'boolean') {
      return apiError('BAD_REQUEST', 'Paramètres invalides');
    }
    await setHackatonWeek(weekKey, isHackaton);
    return apiSuccess({ weekKey, isHackaton });
  }),
);
