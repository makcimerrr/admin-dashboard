import { NextRequest, NextResponse } from 'next/server';
import { makeLog } from '@/lib/log';
import { syncPiscines } from '@/lib/db/services/piscines';
import { isZone01Configured } from '@/lib/services/zone01-graphql';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET;
const log = makeLog('cron:piscine-sync');

/**
 * Synchronisation des piscines de sélection depuis Zone01.
 *
 * Par défaut, ne retraite que les sessions en cours ou closes depuis moins de
 * 30 jours : une piscine terminée l'an dernier n'évolue plus, et la retélécharger
 * toutes les 4 h serait du gaspillage pur.
 *
 * `?all=true` force une reprise complète (après un changement de mapping, ou
 * pour rattraper un historique).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const querySecret = request.nextUrl.searchParams.get('secret');
  const providedSecret = authHeader?.replace('Bearer ', '') || querySecret;

  if (!CRON_SECRET || providedSecret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  if (!isZone01Configured()) {
    return NextResponse.json({ success: false, reason: 'ACCESS_TOKEN Zone01 non configuré' });
  }

  const all = request.nextUrl.searchParams.get('all') === 'true';
  const result = await syncPiscines({ onlyOngoing: !all });

  log.info('synchro piscines terminée', result);
  return NextResponse.json({ success: true, scope: all ? 'toutes' : 'en cours', ...result });
}
