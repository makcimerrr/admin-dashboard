import { NextRequest, NextResponse } from 'next/server';
import { syncEmargementStatuses } from '@/lib/db/services/emargementSync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Synchronise les statuts des apprenants depuis émargement (SENS UNIQUE :
 * émargement lu, hub écrit — cf. `syncEmargementStatuses`).
 *
 * Historiquement limité à `archived`, ce cron synchronise désormais AUSSI le
 * statut `alternant` (contrat émargement) + dates de contrat. Le chemin est
 * conservé pour ne pas casser la planification existante.
 *
 * Auth : Authorization: Bearer <CRON_SECRET> ou ?secret=. ?dry=1 = aperçu.
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

  try {
    const result = await syncEmargementStatuses({ dry });
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sync émargement échouée';
    if (message.includes('non configuré')) {
      return NextResponse.json({ success: false, skipped: true, reason: message });
    }
    console.error('sync-archived-students:', e);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
