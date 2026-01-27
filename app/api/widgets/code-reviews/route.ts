import { NextResponse } from 'next/server';
import { getActivePromotions } from '@/lib/config/promotions';
import { getProjectNamesByTrack, getAllTracks } from '@/lib/config/projects';
import { fetchPromotionProgressions, getUniqueStudents, getUnauditedStudents, Zone01ProgressEntry } from '@/lib/services/zone01';
import { getAuditedStudentsByPromoAndTrack, getRecentAudits } from '@/lib/db/services/audits';
import { getDropoutLogins } from '@/lib/db/services/dropouts';
import { calculateProgress } from '@/lib/types/code-reviews';
import type { Track } from '@/lib/db/schema/audits';

/**
 * Filtre les progressions Zone01 pour exclure les étudiants en perdition
 */
function filterOutDropouts(
    progressions: Zone01ProgressEntry[],
    dropoutLogins: Set<string>
): Zone01ProgressEntry[] {
    return progressions.filter(p => !dropoutLogins.has(p.user.login.toLowerCase()));
}

type TrackStats = {
    track: string;
    pendingStudents: number;
    totalStudents: number;
    auditProgress: number;
};

type PromoStats = {
    promoId: string;
    promoName: string;
    totalPendingStudents: number;
    tracks: TrackStats[];
};

/**
 * GET /api/widgets/code-reviews
 *
 * Retourne les statistiques d'audit pour le widget dashboard.
 * Calcule pour chaque promotion active :
 *   - Le nombre d'étudiants restant à auditer par tronc
 *   - Le pourcentage de progression
 */
export async function GET() {
    try {
        const activePromos = getActivePromotions();
        const tracks = getAllTracks();

        // Récupérer les logins des étudiants en perdition une seule fois
        const dropoutLogins = await getDropoutLogins();

        // Limiter aux 3 promotions les plus récentes pour performance
        const promosToProcess = activePromos.slice(-3);

        const promoStats: PromoStats[] = [];
        let totalPending = 0;

        for (const promo of promosToProcess) {
            const promoId = String(promo.eventId);

            try {
                // Récupérer les progressions Zone01 et filtrer les perditions
                const allProgressions = await fetchPromotionProgressions(promoId);
                const progressions = filterOutDropouts(allProgressions, dropoutLogins);

                if (progressions.length === 0) {
                    continue;
                }

                const trackStats: TrackStats[] = [];
                let promoTotalPending = 0;

                for (const track of tracks) {
                    const projectNames = getProjectNamesByTrack(track);
                    // Créer un set case-insensitive pour la comparaison
                    const projectNamesLower = new Set(projectNames.map(n => n.toLowerCase()));

                    // Récupérer les étudiants audités pour ce tronc
                    const auditedStudentsMap = await getAuditedStudentsByPromoAndTrack(promoId, track);

                    // Calculer les étudiants non audités
                    const unauditedLogins = getUnauditedStudents(progressions, projectNames, auditedStudentsMap);

                    // Compter les étudiants uniques sur ce tronc (case-insensitive)
                    const allStudents = getUniqueStudents(progressions);
                    const studentsOnTrack = allStudents.filter((s) =>
                        s.projects.some((p) => projectNamesLower.has(p.name.toLowerCase()))
                    );

                    const totalStudents = studentsOnTrack.length;
                    const pendingStudents = unauditedLogins.length;
                    const auditedStudents = totalStudents - pendingStudents;
                    const progress = calculateProgress(auditedStudents, totalStudents);

                    trackStats.push({
                        track,
                        pendingStudents,
                        totalStudents,
                        auditProgress: progress,
                    });

                    promoTotalPending += pendingStudents;
                }

                promoStats.push({
                    promoId,
                    promoName: promo.key,
                    totalPendingStudents: promoTotalPending,
                    tracks: trackStats,
                });

                totalPending += promoTotalPending;
            } catch (error) {
                console.error(`Error processing promo ${promo.key}:`, error);
                // Continuer avec les autres promos
            }
        }

        // Compter les audits récents
        const recentAudits = await getRecentAudits(100);

        return NextResponse.json({
            promos: promoStats,
            totalPending,
            recentAuditsCount: recentAudits.length,
        });
    } catch (error) {
        console.error('Error in code-reviews widget API:', error);
        return NextResponse.json(
            { error: 'Erreur lors du calcul des statistiques' },
            { status: 500 }
        );
    }
}
