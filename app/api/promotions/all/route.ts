import { NextResponse } from 'next/server';
import { getAllPromotions } from '@/lib/config/promotions';

export async function GET() {
  try {
    const promotions = await getAllPromotions();

    return NextResponse.json({
      success: true,
      promotions
    });
  } catch (error) {
    console.error('Error fetching promotions:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la récupération des promotions'
      },
      { status: 500 }
    );
  }
}
