import { NextRequest, NextResponse } from 'next/server';
import { getAllPromotions } from '@/lib/config/promotions';
import { getArchivedPromotions } from '@/lib/db/services/promotions';
import { fetchPromotionProgressions } from '@/lib/services/zone01';
import {
  upsertGroupStatus,
  getPendingAuditNotifications,
  markAuditNotified,
  getNotifiedCount,
  getOverdueGroups,
  markReminderSent,
  getBookedWithoutReview,
  markCoachAlerted
} from '@/lib/db/services/groupStatuses';
import { getDiscordIdByLogin } from '@/lib/db/services/discordUsers';
import { sendDiscordDM } from '@/lib/services/discord';
import { notifyViaBot } from '@/lib/services/bot-notify';
import { sendTeamsFormsCard, buildRelanceCard } from '@/lib/services/teams';
import { getTrackByProjectName, getAllProjects } from '@/lib/config/projects';
import { getReviewerForRoundRobin } from '@/lib/db/services/reviewers';
import type { Track } from '@/lib/db/schema/audits';

export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;

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
    const [promotions, archivedPromos, projectsConfig] = await Promise.all([
      getAllPromotions(),
      getArchivedPromotions(),
      getAllProjects()
    ]);

    const archivedNames = new Set(archivedPromos.map((p) => p.name));
    const activePromos = promotions.filter((p) => !archivedNames.has(p.key));

    // Projets OBLIGATOIRES du tronc commun (présents en config, non optionnels) :
    // seuls ceux-ci déclenchent une relance/card de code-review. Exclut donc
    // optionnels, bonus (hors config) et projets piscine/additionnels.
    const mandatoryProjects = new Set<string>();
    for (const track of Object.keys(projectsConfig) as Track[]) {
      for (const project of projectsConfig[track]) {
        // Obligatoire ET soumis à code-review staff (exclut go-reloaded, graphql…
        // marqués no_code_review) → seuls ceux-ci déclenchent une relance CR.
        if (!project.optional && !project.noCodeReview) {
          mandatoryProjects.add(project.name.toLowerCase());
        }
      }
    }

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
        // Hors tronc commun obligatoire (optionnel/bonus/piscine) → pas de relance.
        if (!mandatoryProjects.has(group.projectName.toLowerCase())) {
          results.push({ outcome: 'skipped' });
          continue;
        }

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

        const track = await getTrackByProjectName(group.projectName);
        const promoKey = promo?.key;
        const reviewer = await getReviewerForRoundRobin(track, assignmentIndex, promoKey);
        if (!reviewer) {
          results.push({ outcome: 'skipped' });
          continue;
        }
        const message = buildAuditMessage(
          group.captainLogin,
          group.projectName,
          promoName,
          reviewer
        );

        const facts = [
          { name: 'Projet', value: group.projectName },
          { name: 'Promo', value: promoName },
          { name: 'Coach', value: reviewer.name },
        ];

        // Émission via le bot (embed interactif : bouton vert « Marquer le CR
        // comme réservé »). Le reviewer ne sert qu'au texte/URL/nom de coach.
        const bot = await notifyViaBot({
          type: 'cr_rdv',
          recipientDiscordId: discordId,
          title: 'Code review à réserver',
          body: message,
          facts,
          url: reviewer.planningUrl,
          actions: { bookButton: true, replyButton: false },
          context: {
            type: 'cr_rdv',
            source_label: 'Code review',
            groupId: group.groupId,
            promoId: group.promoId,
            projectName: group.projectName,
            captainLogin: group.captainLogin,
          },
        });

        // Fallback DM texte simple si le bot est injoignable.
        const sent = bot.ok ? true : await sendDiscordDM(discordId, message);

        if (sent) {
          assignmentIndex++;
          await markAuditNotified(group.id, reviewer.name);
          // Feature 5 : relance émise en parallèle sur Teams (Canal 2).
          await sendTeamsFormsCard(
            buildRelanceCard({
              title: 'Relance — Code review à réserver',
              facts: [
                { title: 'Capitaine', value: group.captainLogin },
                { title: 'Projet', value: group.projectName },
                { title: 'Promo', value: promoName },
                { title: 'Coach', value: reviewer.name },
              ],
              url: reviewer.planningUrl,
              urlLabel: 'Ouvrir le planning',
            }),
          );
        }
        results.push({ outcome: sent ? 'notified' : 'error' });
      } catch (err) {
        console.error(`Notification error for group ${group.id}:`, err);
        results.push({ outcome: 'error' });
      }
    }

    for (const result of results) {
      if (result.outcome === 'notified') notified++;
      else if (result.outcome === 'skipped') skippedNoDiscordId++;
      else errors++;
    }

    // Step 3: Auto-remind overdue groups (>14 days without booking a slot)
    const overdue = await getOverdueGroups();
    let reminders = 0;

    for (const group of overdue) {
      try {
        // Hors tronc commun obligatoire → pas de relance.
        if (!mandatoryProjects.has(group.projectName.toLowerCase())) continue;
        if (!group.captainLogin) continue;
        const discordId = await getDiscordIdByLogin(group.captainLogin);
        if (!discordId) continue;

        const promo = promotions.find(p => String(p.eventId) === group.promoId);
        const pName = promo?.title ?? promo?.key ?? group.promoId;
        const days = Math.floor((Date.now() - new Date(group.notifiedAuditAt!).getTime()) / 86_400_000);

        const reminderMessage = [
          `Hey ${group.captainLogin} ! ⚠️`,
          ``,
          `Rappel : ton groupe attend une code-review pour **${group.projectName}** (${pName}) depuis **${days} jours**.`,
          ``,
          `Merci de réserver un créneau au plus vite, le délai est dépassé.`,
          ``,
          `Si tu as des difficultés, n'hésite pas à contacter le staff. 💪`
        ].join('\n');

        // Émission via le bot (bouton vert « Marquer le CR comme réservé »).
        // Fallback DM.
        const bot = await notifyViaBot({
          type: 'cr_rdv',
          recipientDiscordId: discordId,
          title: 'Rappel — code review en attente',
          body: reminderMessage,
          facts: [
            { name: 'Projet', value: group.projectName },
            { name: 'Promo', value: pName },
            { name: 'En attente depuis', value: `${days} jours` },
          ],
          actions: { bookButton: true, replyButton: false },
          context: {
            type: 'cr_rdv',
            source_label: 'Code review',
            groupId: group.groupId,
            promoId: group.promoId,
            projectName: group.projectName,
            captainLogin: group.captainLogin,
          },
        });

        const sent = bot.ok ? true : await sendDiscordDM(discordId, reminderMessage);
        if (sent) {
          reminders++;
          // Relance émise en parallèle sur Teams (Canal 2).
          await sendTeamsFormsCard(
            buildRelanceCard({
              title: 'Rappel — Code review en attente',
              facts: [
                { title: 'Capitaine', value: group.captainLogin },
                { title: 'Projet', value: group.projectName },
                { title: 'Promo', value: pName },
                { title: 'En attente depuis', value: `${days} jours` },
              ],
            }),
          );
        }
        await markReminderSent(group.id);
      } catch (err) {
        console.error(`Reminder error for group ${group.id}:`, err);
      }
    }

    // Step 4: Alerte coach (Teams) — groupe RÉSERVÉ depuis ≥10 j mais review
    // toujours pas saisie (aucun audit) → on prévient le coach (une seule fois).
    const bookedNoReview = await getBookedWithoutReview();
    let coachAlerts = 0;

    for (const group of bookedNoReview) {
      try {
        if (!mandatoryProjects.has(group.projectName.toLowerCase())) continue;
        const promo = promotions.find((p) => String(p.eventId) === group.promoId);
        const pName = promo?.title ?? promo?.key ?? group.promoId;
        const reservedAt = group.rdvConfirmedAt ?? group.slotBookedAt;
        const days = reservedAt
          ? Math.floor((Date.now() - new Date(reservedAt).getTime()) / 86_400_000)
          : null;

        const ok = await sendTeamsFormsCard(
          buildRelanceCard({
            title: '⚠️ Review non saisie — à vérifier',
            facts: [
              ...(group.notifiedReviewerName
                ? [{ title: 'Coach', value: group.notifiedReviewerName }]
                : []),
              { title: 'Capitaine', value: group.captainLogin ?? '—' },
              { title: 'Projet', value: group.projectName },
              { title: 'Promo', value: pName },
              ...(days != null ? [{ title: 'Réservé depuis', value: `${days} jours` }] : []),
              { title: 'À vérifier', value: 'Saisie de la review manquante, ou projet non audité ?' },
            ],
          }),
        );
        if (ok) {
          coachAlerts++;
          await markCoachAlerted(group.id);
        }
      } catch (err) {
        console.error(`Coach alert error for group ${group.id}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        promosProcessed: activePromos.length,
        pendingNotifications: pending.length,
        notified,
        skippedNoDiscordId,
        errors,
        overdueReminders: reminders,
        overdueTotal: overdue.length,
        coachAlerts,
        bookedNoReviewTotal: bookedNoReview.length
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
