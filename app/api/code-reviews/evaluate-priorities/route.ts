import { NextRequest, NextResponse } from 'next/server';
import { fetchPromotionProgressions, buildProjectGroups } from '@/lib/services/zone01';
import { getAuditsByPromoAndTrack } from '@/lib/db/services/audits';
import { getDropoutLogins } from '@/lib/db/services/dropouts';
import { getProjectNamesByTrack } from '@/lib/config/projects';
import { parsePromoId } from '@/lib/config/promotions';
import { evaluatePendingPriorities } from '@/lib/services/pending-priority';
import type { Track } from '@/lib/db/schema/audits';

/**
 * GET /api/code-reviews/evaluate-priorities
 *
 * Évalue la priorité de tous les groupes en attente d'audit
 * Retourne une liste triée par priorité
 *
 * Query params:
 * - promoId: ID de la promotion (requis)
 * - track: Filtrer par tronc (optionnel)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const promoId = searchParams.get('promoId');
    const trackFilter = searchParams.get('track') as Track | null;

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

    // Déterminer les tracks à traiter
    const tracks: Track[] = trackFilter
      ? [trackFilter]
      : ['Golang', 'Javascript', 'Rust', 'Java'];

    const pendingGroups: Array<{
      groupId: string;
      projectName: string;
      track: Track;
      members: Array<{ login: string; isDropout: boolean }>;
      activeMembers: number;
    }> = [];

    for (const track of tracks) {
      const projectNames = getProjectNamesByTrack(track);

      // Récupérer les audits existants pour ce tronc
      const audits = await getAuditsByPromoAndTrack(String(promo.eventId), track);
      const auditedGroupIds = new Set(audits.map(a => a.groupId));

      for (const projectName of projectNames) {
        const projectGroups = buildProjectGroups(progressions, projectName);

        for (const group of projectGroups) {
          // Ne garder que les groupes finished NON audités
          if (group.status !== 'finished') continue;
          if (auditedGroupIds.has(group.groupId)) continue;

          // Enrichir les membres avec le statut dropout
          const membersWithDropout = group.members.map(m => ({
            login: m.login,
            isDropout: dropoutLogins.has(m.login.toLowerCase()),
          }));

          // Compter les membres actifs (non-dropout)
          const activeMembers = membersWithDropout.filter(m => !m.isDropout).length;

          pendingGroups.push({
            groupId: group.groupId,
            projectName,
            track,
            members: membersWithDropout,
            activeMembers,
          });
        }
      }
    }

    // Évaluer les priorités
    const result = await evaluatePendingPriorities(String(promo.eventId), pendingGroups);

    return NextResponse.json({
      success: true,
      ...result,
      promoName: promo.key,
    });
  } catch (error) {
    console.error('Error evaluating priorities:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    );
  }
}
