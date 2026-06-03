import { NextRequest, NextResponse } from 'next/server';
import { getWeeklyRecap } from '@/lib/db/services/crCockpit';
import { buildRecapCard } from '@/lib/services/teams-recap';
import { sendTeamsCard, isTeamsConfigured } from '@/lib/services/teams';

export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Chantier C — recap hebdo des code-reviews posté sur Teams (Flux de travail).
 *
 * Auth : Authorization: Bearer <CRON_SECRET> (envoyé auto par le cron Vercel)
 *        ou ?secret=.
 * ?dry=1 : renvoie la carte sans la poster (preview avant config du webhook).
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production' && CRON_SECRET) {
    const authHeader = request.headers.get('authorization');
    const querySecret = request.nextUrl.searchParams.get('secret');
    const provided = authHeader?.replace('Bearer ', '') || querySecret;
    if (provided !== CRON_SECRET) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
  }

  const dry = request.nextUrl.searchParams.get('dry') === '1';

  const recap = await getWeeklyRecap(Date.now());
  const card = buildRecapCard(recap);

  if (dry) {
    return NextResponse.json({ success: true, dry: true, teamsConfigured: isTeamsConfigured(), card });
  }

  if (!isTeamsConfigured()) {
    // Pas d'erreur : le cron ne doit pas apparaître en échec tant que le
    // webhook Teams n'est pas branché.
    return NextResponse.json({ success: true, skipped: true, reason: 'TEAMS_WEBHOOK_URL non configuré', teamsConfigured: false });
  }

  const posted = await sendTeamsCard(card);
  return NextResponse.json({ success: posted, posted, teamsConfigured: true });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
