import type { NextRequest } from 'next/server';
import { getPiscineWeek, setPiscineWeek } from '@/lib/db/services/planning';
import { apiError, apiSuccess, withAuth, withErrorHandler } from '@/lib/api';

export const GET = withErrorHandler(
  withAuth(async (req: NextRequest) => {
    const weekKey = req.nextUrl.searchParams.get('weekKey');
    if (!weekKey) return apiError('BAD_REQUEST', 'weekKey requis');
    const result = await getPiscineWeek(weekKey);
    return apiSuccess({ weekKey, isPiscine: !!(result && result.isPiscine) });
  }),
);

export const POST = withErrorHandler(
  withAuth(async (req: NextRequest) => {
    const { weekKey, isPiscine } = await req.json();
    if (!weekKey || typeof isPiscine !== 'boolean') {
      return apiError('BAD_REQUEST', 'Paramètres invalides');
    }
    await setPiscineWeek(weekKey, isPiscine);
    return apiSuccess({ weekKey, isPiscine });
  }),
);
