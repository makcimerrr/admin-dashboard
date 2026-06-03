import { NextRequest, NextResponse } from 'next/server';
import { getCrCockpit, setCrTarget } from '@/lib/db/services/crCockpit';

/**
 * Chantier B — cockpit de surveillance des code-reviews.
 *  GET   → métriques par promo (audits/semaine, tendance, pending, bloqués…)
 *  PATCH → { promoId, weeklyTarget } : définit l'objectif hebdo d'une promo.
 *
 * 100 % données locales (audits + group_statuses) → rapide, pas d'appel Zone01.
 */
export async function GET() {
  try {
    const data = await getCrCockpit(Date.now());
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error('GET /api/code-reviews/cockpit error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du chargement du cockpit.' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const promoId = String(body?.promoId ?? '').trim();
    const weeklyTarget = Number(body?.weeklyTarget);
    if (!promoId || !Number.isFinite(weeklyTarget) || weeklyTarget < 0) {
      return NextResponse.json(
        { success: false, error: 'promoId et weeklyTarget (≥ 0) requis.' },
        { status: 400 },
      );
    }
    await setCrTarget(promoId, Math.floor(weeklyTarget));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/code-reviews/cockpit error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour de l\'objectif.' },
      { status: 500 },
    );
  }
}
