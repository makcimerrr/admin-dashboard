import { NextRequest, NextResponse } from 'next/server';
import { getAllPromotions } from '@/lib/config/promotions';
import { getArchivedPromotions } from '@/lib/db/services/promotions';
import { fetchPromotionProgressions } from '@/lib/services/zone01';
import {
  upsertGroupStatus,
  getPendingAuditNotifications,
  markAuditNotified,
  getNotifiedCount
} from '@/lib/db/services/groupStatuses';
import { getDiscordIdByLogin } from '@/lib/db/services/discordUsers';
import { sendDiscordDM } from '@/lib/services/discord';

export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;

// Reviewers avec leur lien de planning — ajouter Cyril et Nassuif quand disponibles
const REVIEWERS = [
  { name: 'Maxime', planningUrl: 'https://calendar.app.google/2MoLxboyXGECFUjT6' },
  { name: 'Vivien', planningUrl: 'https://calendar.app.google/eF8cYjKbHwrJ2X8T8' },
  // { name: 'Cyril', planningUrl: '' },
  // { name: 'Nassuif', planningUrl: '' },
];

function getReviewer(notifiedSoFar: number): (typeof REVIEWERS)[number] {
  return REVIEWERS[notifiedSoFar % REVIEWERS.length];
}

function buildAuditMessage(
  captainLogin: string,
  projectName: string,
  promoName: string,
  reviewer: { name: string; planningUrl: string }
): string {
  return [
    `Hey ${captainLogin} ! 👋`,
    ``,
    `Bonne nouvelle : ton groupe vient de terminer **${projectName}** (${promoName}) et est maintenant en attente de code-review avec le staff ! 🎉`,
    ``,
    `En tant que **capitaine**, c'est à toi de réserver le créneau pour toute ton équipe avec **${reviewer.name}** :`,
    `📅 ${reviewer.planningUrl}`,
    ``,
    `N'oublie pas de prévenir tes coéquipiers une fois le rendez-vous fixé.`,
    ``,
    `Bonne chance pour la review, on vous attend ! 💪`
  ].join('\n');
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production' && CRON_SECRET) {
    const authHeader = request.headers.get('authorization');
    const querySecret = request.nextUrl.searchParams.get('secret');
    const providedSecret = authHeader?.replace('Bearer ', '') || querySecret;

    if (providedSecret !== CRON_SECRET) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
  }

  try {
    const [promotions, archivedPromos] = await Promise.all([
      getAllPromotions(),
      getArchivedPromotions()
    ]);

    const archivedNames = new Set(archivedPromos.map((p) => p.name));
    const activePromos = promotions.filter((p) => !archivedNames.has(p.key));

    // Step 1: Fetch progressions for all promos in parallel
    await Promise.allSettled(
      activePromos.map(async (promo) => {
        try {
          const progressions = await fetchPromotionProgressions(
            String(promo.eventId)
          );

          const groupMap = new Map<
            string,
            {
              groupId: string;
              projectName: string;
              status: string;
              captainLogin?: string;
            }
          >();

          for (const entry of progressions) {
            if (entry.group.status === 'without group') continue;

            const key = `${entry.group.id}:${entry.object.name}`;
            if (!groupMap.has(key)) {
              groupMap.set(key, {
                groupId: String(entry.group.id),
                projectName: entry.object.name,
                status: entry.group.status,
                captainLogin: entry.group.captainLogin ?? entry.user.login
              });
            }
          }

          await Promise.allSettled(
            [...groupMap.values()].map((group) =>
              upsertGroupStatus(
                group.groupId,
                String(promo.eventId),
                group.projectName,
                group.status,
                group.captainLogin
              )
            )
          );
        } catch (err) {
          console.error(
            `Error fetching progressions for promo ${promo.eventId}:`,
            err
          );
        }
      })
    );

    // Step 2: Notify pending audit groups — round-robin reviewer assignment
    const pending = await getPendingAuditNotifications();
    const alreadyNotified = await getNotifiedCount();

    let notified = 0;
    let skippedNoDiscordId = 0;
    let errors = 0;

    // Process sequentially to guarantee round-robin order
    const results: { outcome: 'notified' | 'skipped' | 'error' }[] = [];
    let assignmentIndex = alreadyNotified;

    for (const group of pending) {
      try {
        const promo = promotions.find(
          (p) => String(p.eventId) === group.promoId
        );
        const promoName = promo?.title ?? promo?.key ?? group.promoId;

        if (!group.captainLogin) {
          results.push({ outcome: 'skipped' });
          continue;
        }

        const discordId = await getDiscordIdByLogin(group.captainLogin);

        if (!discordId) {
          results.push({ outcome: 'skipped' });
          continue;
        }

        const reviewer = getReviewer(assignmentIndex);
        const message = buildAuditMessage(
          group.captainLogin,
          group.projectName,
          promoName,
          reviewer
        );
        const sent = await sendDiscordDM(discordId, message);

        if (sent) assignmentIndex++;
        results.push({ outcome: sent ? 'notified' : 'error' });
      } catch (err) {
        console.error(`Notification error for group ${group.id}:`, err);
        results.push({ outcome: 'error' });
      } finally {
        await markAuditNotified(group.id);
      }
    }

    for (const result of results) {
      if (result.outcome === 'notified') notified++;
      else if (result.outcome === 'skipped') skippedNoDiscordId++;
      else errors++;
    }

    return NextResponse.json({
      success: true,
      summary: {
        promosProcessed: activePromos.length,
        pendingNotifications: pending.length,
        notified,
        skippedNoDiscordId,
        errors
      }
    });
  } catch (error) {
    console.error('Cron notify-audit-groups error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
