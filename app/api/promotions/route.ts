import { NextResponse } from 'next/server';
import { getAllPromotions } from '@/lib/config/promotions';

export async function GET() {
  try {
    const promotions = await getAllPromotions();
    return NextResponse.json({
      success: true,
      promotions
    });
  } catch (err: any) {
    console.error('API ERROR:', err);

    return NextResponse.json(
      { success: false, error: 'Internal error', details: String(err) },
      { status: 500 }
    );
  }
}
