import { NextRequest, NextResponse } from 'next/server';
import { getAllPromotions } from '@/lib/config/promotions';
import { getArchivedPromoNames } from '@/lib/db/filters';

export async function GET(request: NextRequest) {
  try {
    let promotions = await getAllPromotions();

    // ?activeOnly=1 → exclut les promos archivées (utilisé par le cron de MAJ
    // pour ne pas traiter les archivées, qui renvoient 400 sur update-students).
    const activeOnly = request.nextUrl.searchParams.get('activeOnly');
    if (activeOnly === '1' || activeOnly === 'true') {
      const archived = await getArchivedPromoNames();
      promotions = promotions.filter((p) => !archived.has(p.key));
    }

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
