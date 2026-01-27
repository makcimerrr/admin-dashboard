import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/stack-server';
import {
    archivePromotion,
    unarchivePromotion,
    getAllPromotions,
    getArchivedPromotions
} from '@/lib/db/services/promotions';

/**
 * GET /api/promotions/archive
 *
 * Récupère les promotions archivées ou toutes les promotions
 * Query params:
 *   - all: si "true", retourne toutes les promotions (actives + archivées)
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const includeAll = searchParams.get('all') === 'true';

        if (includeAll) {
            const promotions = await getAllPromotions(true);
            return NextResponse.json({ success: true, promotions });
        }

        const archivedPromos = await getArchivedPromotions();
        return NextResponse.json({ success: true, promotions: archivedPromos });
    } catch (error) {
        console.error('Error fetching promotions:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur lors de la récupération des promotions' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/promotions/archive
 *
 * Archive une promotion
 * Body: { promoName: string, reason?: string }
 */
export async function POST(request: NextRequest) {
    try {
        // Vérifier l'authentification
        const user = await stackServerApp.getUser();
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Non authentifié' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { promoName, reason } = body;

        if (!promoName) {
            return NextResponse.json(
                { success: false, error: 'Le nom de la promotion est requis' },
                { status: 400 }
            );
        }

        const result = await archivePromotion(promoName, reason);

        return NextResponse.json({
            success: true,
            message: result,
            archivedBy: user.displayName || user.primaryEmail
        });
    } catch (error) {
        console.error('Error archiving promotion:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Erreur lors de l\'archivage' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/promotions/archive
 *
 * Désarchive une promotion
 * Body: { promoName: string }
 */
export async function DELETE(request: NextRequest) {
    try {
        // Vérifier l'authentification
        const user = await stackServerApp.getUser();
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Non authentifié' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { promoName } = body;

        if (!promoName) {
            return NextResponse.json(
                { success: false, error: 'Le nom de la promotion est requis' },
                { status: 400 }
            );
        }

        const result = await unarchivePromotion(promoName);

        return NextResponse.json({
            success: true,
            message: result,
            unarchivedBy: user.displayName || user.primaryEmail
        });
    } catch (error) {
        console.error('Error unarchiving promotion:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Erreur lors de la désarchivation' },
            { status: 500 }
        );
    }
}
