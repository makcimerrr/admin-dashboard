import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/stack-server';
import {
    createAudit,
    getRecentAudits,
    getAuditsByPromoAndTrack,
    type CreateAuditInput,
} from '@/lib/db/services/audits';
import { fetchPromotionProgressions, buildProjectGroups } from '@/lib/services/zone01';
import { canAuditGroup } from '@/lib/types/code-reviews';
import { TRACKS, type Track } from '@/lib/db/schema/audits';
import { z } from 'zod';

// Schéma de validation pour la création d'audit
const createAuditSchema = z.object({
    promoId: z.string().min(1),
    track: z.enum(TRACKS),
    projectName: z.string().min(1),
    groupId: z.string().min(1),
    summary: z.string().optional().default(''),
    warnings: z.array(z.string()).default([]),
    results: z.array(z.object({
        studentLogin: z.string().min(1),
        validated: z.boolean(),
        feedback: z.string().nullable().optional(),
        warnings: z.array(z.string()).default([]),
    })),
});

/**
 * GET /api/code-reviews
 *
 * Récupère les audits.
 * Query params:
 *   - promoId: filtrer par promotion
 *   - track: filtrer par tronc (nécessite promoId)
 *   - limit: nombre d'audits à retourner (défaut: 20)
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const promoId = searchParams.get('promoId');
        const track = searchParams.get('track');
        const limit = parseInt(searchParams.get('limit') || '20', 10);

        // Si promoId et track sont fournis, filtrer par ces critères
        if (promoId && track) {
            const audits = await getAuditsByPromoAndTrack(promoId, track);
            return NextResponse.json(audits);
        }

        // Sinon, retourner les derniers audits
        const audits = await getRecentAudits(limit);
        return NextResponse.json(audits);
    } catch (error) {
        console.error('Error fetching audits:', error);
        return NextResponse.json(
            { error: 'Erreur lors de la récupération des audits' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/code-reviews
 *
 * Crée un nouvel audit.
 * Vérifie que:
 *   - L'utilisateur est authentifié
 *   - Le groupe existe et est terminé
 *   - Le groupe n'a pas déjà été audité
 */
export async function POST(request: NextRequest) {
    try {
        // Vérifier l'authentification
        const user = await stackServerApp.getUser();
        if (!user) {
            return NextResponse.json(
                { error: 'Non authentifié' },
                { status: 401 }
            );
        }

        // Parser et valider le body
        const body = await request.json();
        const validation = createAuditSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Données invalides', details: validation.error.flatten() },
                { status: 400 }
            );
        }

        const data = validation.data;

        // Vérifier que le groupe existe et peut être audité
        const progressions = await fetchPromotionProgressions(data.promoId);
        const groups = buildProjectGroups(progressions, data.projectName);
        const group = groups.find((g) => g.groupId === data.groupId);

        if (!group) {
            return NextResponse.json(
                { error: 'Groupe non trouvé' },
                { status: 404 }
            );
        }

        if (!canAuditGroup(group.status)) {
            return NextResponse.json(
                { error: 'Ce groupe ne peut pas être audité (projet non terminé)' },
                { status: 400 }
            );
        }

        // Vérifier que tous les étudiants du résultat sont dans le groupe
        const groupLogins = new Set(group.members.map((m) => m.login));
        const invalidLogins = data.results.filter((r) => !groupLogins.has(r.studentLogin));
        if (invalidLogins.length > 0) {
            return NextResponse.json(
                {
                    error: 'Certains étudiants ne font pas partie du groupe',
                    invalidLogins: invalidLogins.map((r) => r.studentLogin),
                },
                { status: 400 }
            );
        }

        // Créer l'audit
        const auditInput: CreateAuditInput = {
            promoId: data.promoId,
            track: data.track,
            projectName: data.projectName,
            groupId: data.groupId,
            summary: data.summary,
            warnings: data.warnings,
            auditorId: parseInt(user.id, 10) || 0, // Stack Auth user ID
            auditorName: user.displayName || user.primaryEmail || 'Anonyme',
            results: data.results.map((r) => ({
                studentLogin: r.studentLogin,
                validated: r.validated,
                feedback: r.feedback ?? undefined,
                warnings: r.warnings,
            })),
        };

        const audit = await createAudit(auditInput);

        return NextResponse.json(audit, { status: 201 });
    } catch (error) {
        console.error('Error creating audit:', error);

        // Gérer l'erreur de contrainte unique (audit déjà existant)
        if (error instanceof Error && error.message.includes('unique')) {
            return NextResponse.json(
                { error: 'Un audit existe déjà pour ce groupe' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: 'Erreur lors de la création de l\'audit' },
            { status: 500 }
        );
    }
}
