import { NextRequest, NextResponse } from 'next/server';
import { getActivePromotions } from '@/lib/config/promotions';

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      promotions: await getActivePromotions()
    });
  } catch (error) {
    console.error('Error fetching active promotions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la récupération des promotions'
      },
      { status: 500 }
    );
  }
}
