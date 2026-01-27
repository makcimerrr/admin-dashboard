import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/stack-server';
import {
    getAlternants,
    getAlternantByLogin,
    setAlternantStatus,
    getAlternantStats,
    getCompanies,
    getAlternantsByCompany,
    type SetAlternantInput
} from '@/lib/db/services/alternants';

/**
 * GET /api/alternants
 *
 * Récupère les alternants avec filtres optionnels
 * Query params:
 *   - promo: filtrer par promotion
 *   - login: récupérer un alternant spécifique
 *   - company: filtrer par entreprise
 *   - stats: si "true", retourne les statistiques
 *   - companies: si "true", retourne la liste des entreprises
 *   - includeDropouts: si "true", inclure les perditions
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const promo = searchParams.get('promo');
        const login = searchParams.get('login');
        const company = searchParams.get('company');
        const wantStats = searchParams.get('stats') === 'true';
        const wantCompanies = searchParams.get('companies') === 'true';
        const includeDropouts = searchParams.get('includeDropouts') === 'true';

        // Si on veut les statistiques
        if (wantStats) {
            const stats = await getAlternantStats();
            return NextResponse.json({ success: true, stats });
        }

        // Si on veut la liste des entreprises
        if (wantCompanies) {
            const companies = await getCompanies();
            return NextResponse.json({ success: true, companies });
        }

        // Si un login est fourni, récupérer cet alternant spécifique
        if (login) {
            const alternant = await getAlternantByLogin(login);
            if (!alternant) {
                return NextResponse.json(
                    { success: false, error: 'Étudiant non trouvé' },
                    { status: 404 }
                );
            }
            return NextResponse.json({ success: true, alternant });
        }

        // Si une entreprise est fournie
        if (company) {
            const alternants = await getAlternantsByCompany(company);
            return NextResponse.json({
                success: true,
                count: alternants.length,
                alternants
            });
        }

        // Sinon, récupérer tous les alternants avec filtre promo optionnel
        const alternants = await getAlternants(promo || undefined, includeDropouts);

        return NextResponse.json({
            success: true,
            count: alternants.length,
            alternants
        });
    } catch (error) {
        console.error('Error fetching alternants:', error);
        return NextResponse.json(
            { success: false, error: 'Erreur lors de la récupération des alternants' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/alternants
 *
 * Définit ou met à jour le statut alternant d'un étudiant
 * Body: {
 *   studentLogin: string,
 *   isAlternant: boolean,
 *   startDate?: string (ISO date),
 *   endDate?: string (ISO date),
 *   companyName?: string,
 *   companyContact?: string,
 *   companyEmail?: string,
 *   companyPhone?: string,
 *   notes?: string
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
        const {
            studentLogin,
            isAlternant,
            startDate,
            endDate,
            companyName,
            companyContact,
            companyEmail,
            companyPhone,
            notes
        } = body;

        if (!studentLogin || typeof isAlternant !== 'boolean') {
            return NextResponse.json(
                { success: false, error: 'studentLogin et isAlternant sont requis' },
                { status: 400 }
            );
        }

        const input: SetAlternantInput = {
            studentLogin,
            isAlternant,
            startDate,
            endDate,
            companyName,
            companyContact,
            companyEmail,
            companyPhone,
            notes
        };

        const updatedAlternant = await setAlternantStatus(input);

        return NextResponse.json({
            success: true,
            alternant: updatedAlternant,
            updatedBy: user.displayName || user.primaryEmail
        });
    } catch (error) {
        console.error('Error updating alternant status:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/alternants
 *
 * Met à jour les informations d'un alternant existant
 * (Alias de POST pour la sémantique REST)
 */
export async function PUT(request: NextRequest) {
    return POST(request);
}
