import { NextResponse } from 'next/server';
import promos from '../../../../config/promoConfig.json';
import promoStatus from '../../../../config/promoStatus.json';

export async function GET(
  req: Request,
  context: { params: Promise<{ promoId: string }> }
) {
  try {
    const { promoId } = await context.params;

    const promo = (promos as any[]).find((p) => String(p.eventId) === promoId);

    if (!promo) {
      return NextResponse.json(
        { success: false, message: 'Promotion not found' },
        { status: 404 }
      );
    }

    // Get current project status from promoStatus.json
    const currentProject = (promoStatus as any)[promo.key] || null;

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
