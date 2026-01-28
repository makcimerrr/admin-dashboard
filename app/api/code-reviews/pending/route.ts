import { NextResponse } from 'next/server';
import { fetchPromotionProgressions, buildProjectGroups } from '@/lib/services/zone01';
import { getAuditsByPromoAndTrack } from '@/lib/db/services/audits';
import { getDropoutLogins } from '@/lib/db/services/dropouts';
import { getProjectNamesByTrack } from '@/lib/config/projects';
import { evaluatePendingPriorities } from '@/lib/services/pending-priority';
import promoConfig from '../../../../config/promoConfig.json';
import type { Track } from '@/lib/db/schema/audits';

const TRACKS: Track[] = ['Golang', 'Javascript', 'Rust', 'Java'];

interface PendingGroup {
  groupId: string;
  projectName: string;
  track: string;
  promoId: string;
  promoName: string;
  members: { login: string; isDropout: boolean }[];
  membersCount: number;
  activeMembers: number;
  status: string;
  priority: 'urgent' | 'warning' | 'normal';
  priorityScore: number;
  priorityReasons: string[];
  membersNeverAudited: number;
}

/**
 * GET /api/code-reviews/pending
 * Récupère tous les groupes terminés non audités avec calcul de priorité intelligent
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const promoIdFilter = searchParams.get('promoId');

    const allPendingGroups: PendingGroup[] = [];

    const promos = promoIdFilter
      ? (promoConfig as any[]).filter(p => String(p.eventId) === promoIdFilter)
      : (promoConfig as any[]).filter(p => p.active !== false);

    // Récupérer les dropouts une seule fois
    const dropoutLogins = await getDropoutLogins();

    // Pour chaque promo, récupérer et évaluer les groupes en attente
    for (const promo of promos) {
      const promoId = String(promo.eventId);
      const promoName = promo.key ?? `Promo ${promoId}`;

      try {
        // Récupérer les progressions et audits pour cette promo
        const [progressions, ...auditsPerTrack] = await Promise.all([
          fetchPromotionProgressions(promoId),
          ...TRACKS.map(track => getAuditsByPromoAndTrack(promoId, track)),
        ]);

        const auditsByTrack = Object.fromEntries(
          TRACKS.map((track, i) => [track, auditsPerTrack[i]])
        ) as Record<Track, typeof auditsPerTrack[0]>;

        // Construire les groupes finished non audités
        const pendingGroupsForEval: Array<{
          groupId: string;
          projectName: string;
          track: Track;
          members: Array<{ login: string; isDropout: boolean }>;
          activeMembers: number;
        }> = [];

        const groupsData: Map<string, {
          groupId: string;
          projectName: string;
          track: Track;
          members: { login: string; isDropout: boolean }[];
          activeMembers: number;
        }> = new Map();

        for (const track of TRACKS) {
          const projectNames = getProjectNamesByTrack(track);
          const audits = auditsByTrack[track];
          const auditsByGroupId = new Map(audits.map(a => [a.groupId, a]));

          for (const projectName of projectNames) {
            const groups = buildProjectGroups(progressions, projectName);

            for (const group of groups) {
              if (group.status !== 'finished') continue;
              if (auditsByGroupId.has(group.groupId)) continue; // Déjà audité

              const membersWithDropout = group.members.map(m => ({
                login: m.login,
                isDropout: dropoutLogins.has(m.login.toLowerCase()),
              }));
              const activeMembers = membersWithDropout.filter(m => !m.isDropout).length;

              // Ignorer les groupes où tous les membres sont en perdition
              if (activeMembers === 0) continue;

              const groupData = {
                groupId: group.groupId,
                projectName,
                track,
                members: membersWithDropout,
                activeMembers,
              };

              groupsData.set(group.groupId, groupData);
              pendingGroupsForEval.push(groupData);
            }
          }
        }

        // Évaluer les priorités avec la logique intelligente
        if (pendingGroupsForEval.length > 0) {
          const evaluation = await evaluatePendingPriorities(promoId, pendingGroupsForEval);

          for (const evalGroup of evaluation.groups) {
            const groupData = groupsData.get(evalGroup.groupId);
            if (!groupData) continue;

            allPendingGroups.push({
              groupId: evalGroup.groupId,
              projectName: evalGroup.projectName,
              track: evalGroup.track,
              promoId,
              promoName,
              members: groupData.members,
              membersCount: groupData.members.length,
              activeMembers: evalGroup.activeMembers,
              status: 'finished',
              priority: evalGroup.priority,
              priorityScore: evalGroup.priorityScore,
              priorityReasons: evalGroup.reasons,
              membersNeverAudited: evalGroup.membersNeverAudited,
            });
          }
        }
      } catch (err) {
        console.error(`Error processing promo ${promoName}:`, err);
      }
    }

    // Trier par score de priorité décroissant
    allPendingGroups.sort((a, b) => b.priorityScore - a.priorityScore);

    // Statistiques
    const stats = {
      total: allPendingGroups.length,
      urgent: allPendingGroups.filter(g => g.priority === 'urgent').length,
      warning: allPendingGroups.filter(g => g.priority === 'warning').length,
      normal: allPendingGroups.filter(g => g.priority === 'normal').length,
      avgScore: allPendingGroups.length > 0
        ? Math.round(allPendingGroups.reduce((sum, g) => sum + g.priorityScore, 0) / allPendingGroups.length)
        : 0
    };

    return NextResponse.json({
      success: true,
      pending: allPendingGroups,
      stats
    });
  } catch (error) {
    console.error('Error fetching pending audits:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors du chargement des audits en attente',
        pending: [],
        stats: { total: 0, urgent: 0, warning: 0, normal: 0, avgScore: 0 }
      },
      { status: 200 } // Return 200 to avoid breaking the UI
    );
  }
}
