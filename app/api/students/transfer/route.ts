import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/stack-server';
import {
    transferStudent,
    getTransferredStudents,
    getStudentTransferHistory
} from '@/lib/db/services/promotions';

/**
 * GET /api/students/transfer
 *
 * Récupère les étudiants transférés
 * Query params:
 *   - promoName: filtrer par promotion de destination (optionnel)
 *   - login: récupérer l'historique d'un étudiant spécifique
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const promoName = searchParams.get('promoName');
        const login = searchParams.get('login');

        // Si un login est fourni, récupérer l'historique de cet étudiant
        if (login) {
            const history = await getStudentTransferHistory(login);
            if (!history) {
                return NextResponse.json(
                    { success: false, error: 'Étudiant non trouvé' },
                    { status: 404 }
                );
            }
            return NextResponse.json({ success: true, student: history });
        }

        // Sinon, récupérer tous les étudiants transférés
        const transferredStudents = await getTransferredStudents(promoName || undefined);

        return NextResponse.json({
            success: true,
            count: transferredStudents.length,
            students: transferredStudents
        });
    } catch (error) {
        console.error('Error fetching transferred students:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur lors de la récupération des transferts' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/students/transfer
 *
 * Transfère un étudiant vers une autre promotion
 * Body: {
 *   studentLogin: string,
 *   targetPromoName: string,
 *   reason?: string
 * }
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
        const { studentLogin, targetPromoName, reason } = body;

        if (!studentLogin || !targetPromoName) {
            return NextResponse.json(
                { success: false, error: 'studentLogin et targetPromoName sont requis' },
                { status: 400 }
            );
        }

        const result = await transferStudent(studentLogin, targetPromoName, reason);

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.message },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            transfer: result,
            transferredBy: user.displayName || user.primaryEmail
        });
    } catch (error) {
        console.error('Error transferring student:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Erreur lors du transfert' },
            { status: 500 }
        );
    }
}
