import { NextResponse } from 'next/server';
import { getAllPromotions } from '@/lib/config/promotions';
import { getAllPromoStatus } from '@/lib/db/services/promoStatus';

export async function GET(
  req: Request,
  context: { params: Promise<{ promoId: string }> }
) {
  try {
    const { promoId } = await context.params;

    const promotions = await getAllPromotions();
    const promo = promotions.find((p) => String(p.eventId) === promoId);

    if (!promo) {
      return NextResponse.json(
        { success: false, message: 'Promotion not found' },
        { status: 404 }
      );
    }

    const allStatus = await getAllPromoStatus();
    const statusEntry = allStatus.find((s) => s.promoKey === promo.key);
    let currentProject: any = statusEntry?.currentProject ?? null;

    // Parse JSON if it's a multi-track object stored as string
    if (currentProject) {
      try {
        currentProject = JSON.parse(currentProject);
      } catch {
        // Not JSON, keep as string
      }
    }

    return NextResponse.json({
      success: true,
      promotion: {
        ...promo,
        currentProject
      }
    });
  } catch (err: any) {
    console.error('API ERROR:', err);

    return NextResponse.json(
      { success: false, error: 'Internal error', details: String(err) },
      { status: 500 }
    );
  }
}
