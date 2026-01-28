import { NextResponse } from 'next/server';
import { db } from '@/lib/db/config';
import { audits } from '@/lib/db/schema/audits';
import { eq } from 'drizzle-orm';
import promoConfig from '../../../../config/promoConfig.json';

interface GroupMember {
  id: number;
  login: string;
  firstName?: string;
  lastName?: string;
}

interface PendingGroup {
  groupId: string;
  projectName: string;
  track: string;
  promoId: string;
  promoName: string;
  members: GroupMember[];
  membersCount: number;
  status: string;
  finishedAt?: string;
  daysPending: number;
  priority: 'urgent' | 'warning' | 'normal';
}

/**
 * GET /api/code-reviews/pending
 * Récupère tous les groupes terminés qui n'ont pas encore été audités
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const promoIdFilter = searchParams.get('promoId');

    // Récupérer tous les audits existants pour savoir quels groupes ont été audités
    const existingAudits = await db.query.audits.findMany({
      columns: {
        promoId: true,
        projectName: true,
        groupId: true
      }
    });

    // Créer un Set des groupes déjà audités
    const auditedGroups = new Set(
      existingAudits.map(a => `${a.promoId}:${a.projectName}:${a.groupId}`)
    );

    const pendingGroups: PendingGroup[] = [];
    const promos = promoIdFilter
      ? (promoConfig as any[]).filter(p => String(p.eventId) === promoIdFilter)
      : (promoConfig as any[]).filter(p => p.active !== false);

    // Pour chaque promo active, récupérer les groupes depuis l'API Zone01
    for (const promo of promos) {
      const eventId = String(promo.eventId);
      const promoName = promo.key ?? `Promo ${eventId}`;

      // Récupérer les groupes terminés (finished) pour cette promo
      // Note: Ceci utilise l'API interne qui elle-même appelle Zone01
      try {
        const tracks = ['Golang', 'Javascript', 'Rust', 'Java'];

        for (const track of tracks) {
          // Appel à l'API interne pour récupérer les groupes
          const internalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/code-reviews/groups?promoId=${eventId}&track=${track}`;

          try {
            const response = await fetch(internalUrl, {
              headers: { 'Content-Type': 'application/json' },
              cache: 'no-store'
            });

            if (!response.ok) continue;

            const data = await response.json();
            const groups = data.groups || [];

            for (const group of groups) {
              // Vérifier si le groupe est terminé et non audité
              if (group.status !== 'finished') continue;

              const groupKey = `${eventId}:${group.projectName}:${group.groupId}`;
              if (auditedGroups.has(groupKey)) continue;

              // Calculer le nombre de jours depuis la fin
              const finishedDate = group.finishedAt ? new Date(group.finishedAt) : new Date();
              const now = new Date();
              const daysPending = Math.floor((now.getTime() - finishedDate.getTime()) / (1000 * 60 * 60 * 24));

              // Déterminer la priorité
              let priority: 'urgent' | 'warning' | 'normal' = 'normal';
              if (daysPending > 14) {
                priority = 'urgent';
              } else if (daysPending > 7) {
                priority = 'warning';
              }

              pendingGroups.push({
                groupId: group.groupId,
                projectName: group.projectName,
                track,
                promoId: eventId,
                promoName,
                members: group.members || [],
                membersCount: group.members?.length || 0,
                status: group.status,
                finishedAt: group.finishedAt,
                daysPending,
                priority
              });
            }
          } catch (err) {
            // Ignorer les erreurs pour un track spécifique
            console.error(`Error fetching groups for ${promoName}/${track}:`, err);
          }
        }
      } catch (err) {
        console.error(`Error processing promo ${promoName}:`, err);
      }
    }

    // Trier par priorité puis par jours en attente
    const priorityOrder = { urgent: 0, warning: 1, normal: 2 };
    pendingGroups.sort((a, b) => {
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      return b.daysPending - a.daysPending;
    });

    // Statistiques
    const stats = {
      total: pendingGroups.length,
      urgent: pendingGroups.filter(g => g.priority === 'urgent').length,
      warning: pendingGroups.filter(g => g.priority === 'warning').length,
      normal: pendingGroups.filter(g => g.priority === 'normal').length,
      avgDaysPending: pendingGroups.length > 0
        ? Math.round(pendingGroups.reduce((sum, g) => sum + g.daysPending, 0) / pendingGroups.length)
        : 0
    };

    return NextResponse.json({
      success: true,
      pending: pendingGroups,
      stats
    });
  } catch (error) {
    console.error('Error fetching pending audits:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du chargement des audits en attente', pending: [], stats: { total: 0, urgent: 0, warning: 0, normal: 0, avgDaysPending: 0 } },
      { status: 200 } // Return 200 to avoid breaking the UI
    );
  }
}
