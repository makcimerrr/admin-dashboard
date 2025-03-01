import { NextResponse } from 'next/server';
import { getDelayStatus, getAverageDelaysByMonth } from '@/lib/db/services/promotions';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const promoId = searchParams.get('promoId');

    if (!promoId) {
      return NextResponse.json(
        { error: 'Le paramètre "promoId" est requis.' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'status':
        // Récupération des données de statut
        const status = await getDelayStatus(promoId);
        return NextResponse.json(status);

      case 'summary':
        // Récupération d'un résumé ou autre type de données
        const summary = await getAverageDelaysByMonth(promoId);
        return NextResponse.json(summary);

      default:
        return NextResponse.json(
          { error: 'Action non reconnue. Utilisez "status" ou "summary".' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Erreur API /api/delay-status :', error);
    return NextResponse.json(
      { error: 'Impossible de récupérer les données.' },
      { status: 500 }
    );
  }
}