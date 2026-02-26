import { NextRequest, NextResponse } from 'next/server';
import { parsePromoId } from '@/lib/config/promotions';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const promoId = searchParams.get('promoId');

    if (!promoId) {
      return NextResponse.json(
        {
          success: false,
          error: 'promoId est requis'
        },
        { status: 400 }
      );
    }

    const promotion = await parsePromoId(promoId);

    if (!promotion) {
      return NextResponse.json(
        {
          success: false,
          error: 'Promotion introuvable'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      promotion
    });
  } catch (error) {
    console.error('Error parsing promoId:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors du traitement de la promotion'
      },
      { status: 500 }
    );
  }
}
