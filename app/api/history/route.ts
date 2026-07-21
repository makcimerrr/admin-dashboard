import { NextResponse } from 'next/server';
import { withPlanningAccess } from '@/lib/api/with-auth';
import { getEnrichedHistory } from '@/lib/db/services/history';

export const GET = withPlanningAccess(async (req) => {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || undefined;
  const userId = searchParams.get('userId') || undefined;
  const action = searchParams.get('action') || undefined;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;
  try {
    const history = await getEnrichedHistory({ type, userId, action, limit });
    return NextResponse.json(history);
  } catch (error) {
    return NextResponse.json({ error: 'Erreur lors de la récupération de l\'historique', details: error }, { status: 500 });
  }
});
