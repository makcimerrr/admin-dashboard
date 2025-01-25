import { NextResponse } from 'next/server';
import { getDelayStatus } from '@/lib/db';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const promoId = searchParams.get('promoId');

        if (!promoId) {
            return NextResponse.json(
                { error: 'Le paramètre "promoId" est requis.' },
                { status: 400 }
            );
        }

        const status = await getDelayStatus(promoId);

        return NextResponse.json(status);
    } catch (error) {
        console.error('Erreur API /api/delay-status :', error);
        return NextResponse.json(
            { error: 'Impossible de récupérer les données.' },
            { status: 500 }
        );
    }
}