import { NextRequest, NextResponse } from 'next/server';
import { fetchPromotionProgressions, buildProjectGroups, type ProjectGroup } from '@/lib/services/zone01';
import { getAuditsByPromoAndTrack, getAuditedGroupIds } from '@/lib/db/services/audits';
import { getDropoutLogins } from '@/lib/db/services/dropouts';
import { getProjectNamesByTrack, getTrackByProjectName } from '@/lib/config/projects';
import { parsePromoId } from '@/lib/config/promotions';
import type { Track } from '@/lib/db/schema/audits';

export interface GroupWithAuditStatus {
    groupId: string;
    projectName: string;
    track: Track;
    status: string;
    members: {
        login: string;
        firstName?: string;
        lastName?: string;
        grade: number | null;
        isDropout: boolean;
    }[];
    isAudited: boolean;
    auditId?: number;
    auditorName?: string;
    auditDate?: string;
    activeMembers: number;
}

/**
 * GET /api/code-reviews/groups
 *
 * Récupère tous les groupes finished d'une promo avec leur statut d'audit
 *
 * Query params:
 * - promoId: ID de la promotion (requis)
 * - track: Filtrer par tronc (optionnel)
 * - project: Filtrer par projet (optionnel)
 * - audited: 'true' | 'false' | 'all' (défaut: 'all')
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const promoId = searchParams.get('promoId');
        const trackFilter = searchParams.get('track') as Track | null;
        const projectFilter = searchParams.get('project');
        const auditedFilter = searchParams.get('audited') || 'all';

        if (!promoId) {
            return NextResponse.json({ error: 'promoId requis' }, { status: 400 });
        }

        const promo = parsePromoId(promoId);
        if (!promo) {
            return NextResponse.json({ error: 'Promotion non trouvée' }, { status: 404 });
        }

        // Récupérer les données en parallèle
        const [progressions, dropoutLogins] = await Promise.all([
            fetchPromotionProgressions(String(promo.eventId)),
            getDropoutLogins(),
        ]);

        // Déterminer les projets à traiter
        const tracks: Track[] = trackFilter
            ? [trackFilter]
            : ['Golang', 'Javascript', 'Rust', 'Java'];

        const groups: GroupWithAuditStatus[] = [];

        for (const track of tracks) {
            const projectNames = getProjectNamesByTrack(track);
            const projectsToProcess = projectFilter
                ? projectNames.filter(p => p.toLowerCase() === projectFilter.toLowerCase())
                : projectNames;

            // Récupérer les audits existants pour ce tronc
            const audits = await getAuditsByPromoAndTrack(String(promo.eventId), track);
            const auditsByGroupId = new Map(audits.map(a => [a.groupId, a]));

            for (const projectName of projectsToProcess) {
                const projectGroups = buildProjectGroups(progressions, projectName);

                for (const group of projectGroups) {
                    // Ne garder que les groupes finished
                    if (group.status !== 'finished') continue;

                    const audit = auditsByGroupId.get(group.groupId);
                    const isAudited = !!audit;

                    // Appliquer le filtre audité
                    if (auditedFilter === 'true' && !isAudited) continue;
                    if (auditedFilter === 'false' && isAudited) continue;

                    // Enrichir les membres avec le statut dropout
                    const membersWithDropout = group.members.map(m => ({
                        ...m,
                        isDropout: dropoutLogins.has(m.login.toLowerCase()),
                    }));

                    // Compter les membres actifs (non-dropout)
                    const activeMembers = membersWithDropout.filter(m => !m.isDropout).length;

                    groups.push({
                        groupId: group.groupId,
                        projectName,
                        track,
                        status: group.status,
                        members: membersWithDropout,
                        isAudited,
                        auditId: audit?.id,
                        auditorName: audit?.auditorName,
                        auditDate: audit?.createdAt.toISOString(),
                        activeMembers,
                    });
                }
            }
        }

        // Trier: non audités en premier, puis par projet
        groups.sort((a, b) => {
            if (a.isAudited !== b.isAudited) return a.isAudited ? 1 : -1;
            return a.projectName.localeCompare(b.projectName);
        });

        // Calculer les stats
        const stats = {
            totalGroups: groups.length,
            auditedGroups: groups.filter(g => g.isAudited).length,
            pendingGroups: groups.filter(g => !g.isAudited).length,
            byTrack: {} as Record<Track, { total: number; audited: number }>,
        };

        for (const track of tracks) {
            const trackGroups = groups.filter(g => g.track === track);
            stats.byTrack[track] = {
                total: trackGroups.length,
                audited: trackGroups.filter(g => g.isAudited).length,
            };
        }

        return NextResponse.json({
            promoId: String(promo.eventId),
            promoName: promo.key,
            groups,
            stats,
        });
    } catch (error) {
        console.error('Error fetching groups:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Erreur interne' },
            { status: 500 }
        );
    }
}
