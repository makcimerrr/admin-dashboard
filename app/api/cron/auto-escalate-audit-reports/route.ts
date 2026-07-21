import { NextRequest, NextResponse } from 'next/server';
import {
  getAuditRequestsToEscalate,
  getEscalatedUnanswered,
  getSecondReminderTargets,
  markAuditEscalated,
  markSecondReminderSent,
  buildAuditReportReminderMessage,
  buildAuditReportSecondReminderMessage,
  getGroupMemberNames,
} from '@/lib/db/services/auditReports';
import {
  sendTeamsFormsCard,
  buildEscalationCard,
  buildEscalatedUnansweredRecapCard,
  buildAdaptiveCard,
  textBlock,
} from '@/lib/services/teams';
import { getDiscordIdByLogin } from '@/lib/db/services/discordUsers';
import { sendDiscordDM } from '@/lib/services/discord';
import { notifyViaBot } from '@/lib/services/bot-notify';

export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://hub.zone01normandie.org';

/**
 * Feature 7 (auto) — escalade des rapports d'audit sans réponse après 2 jours
 * ouvrés. Pour chaque demande non répondue/non escaladée assez ancienne, poste
 * une carte Teams (Canal 2 — formulaires) puis marque `escalated_at`.
 *
 * Auth : Authorization: Bearer <CRON_SECRET> ou ?secret=.
 * ?dry=1 : liste les escalades prévues sans rien envoyer ni marquer.
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production' && CRON_SECRET) {
    const authHeader = request.headers.get('authorization');
    const querySecret = request.nextUrl.searchParams.get('secret');
    const provided = authHeader?.replace('Bearer ', '') || querySecret;
    if (provided !== CRON_SECRET) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
  }

  const dry = request.nextUrl.searchParams.get('dry') === '1';
  // Page de collecte des comptes-rendus d'audit (table audit_report_requests),
  // PAS /suivi (qui traite la planification des code reviews — autre jeu de données).
  const suiviUrl = `${BASE_URL}/code-reviews/audit-reports`;

  const requests = await getAuditRequestsToEscalate();
  // Récap « toujours sans réponse après relance » : vraies escalades d'un run
  // précédent (> 20 h, fenêtre 14 j) toujours silencieuses. Le cron tourne
  // 1×/jour (8h30 lun-sam via dashboard-daily-cron.sh) → au plus une carte
  // récap par jour.
  const recap = await getEscalatedUnanswered();
  // 2e relance : backlog des escalades > 14 j sans réponse, jamais re-relancées.
  // Lot de 25/run → le backlog initial (~75) s'étale sur 3 jours.
  const secondTargets = await getSecondReminderTargets();

  if (dry) {
    return NextResponse.json({
      success: true,
      dry: true,
      checked: requests.length,
      escalated: requests.map((r) => ({
        id: r.id,
        auditorLogin: r.auditorLogin,
        projectName: r.projectName,
        requestedAt: r.requestedAt,
      })),
      stillUnanswered: recap.items.map((r) => ({
        auditorLogin: r.auditorLogin,
        projectName: r.projectName,
        escalatedAt: r.escalatedAt,
      })),
      olderUnansweredCount: recap.olderCount,
      secondReminders: secondTargets.map((r) => ({
        id: r.id,
        auditorLogin: r.auditorLogin,
        projectName: r.projectName,
        escalatedAt: r.escalatedAt,
      })),
    });
  }

  const escalated: { id: number; auditorLogin: string; dmSent: boolean }[] = [];
  const errors: { id: number; auditorLogin: string }[] = [];
  for (const r of requests) {
    // 1) Alerte Teams staff (source de vérité de l'escalade).
    // eslint-disable-next-line no-await-in-loop
    const teamsOk = await sendTeamsFormsCard(
      buildEscalationCard({
        auditorLogin: r.auditorLogin,
        projectName: r.projectName,
        requestedAt: r.requestedAt,
        suiviUrl,
      }),
    );

    // 2) Relance DM à l'auditeur (best-effort) avec bouton « Répondre » pour
    //    renvoyer son compte-rendu directement. N'empêche pas l'escalade.
    let dmSent = false;
    // eslint-disable-next-line no-await-in-loop
    const discordId = await getDiscordIdByLogin(r.auditorLogin);
    if (discordId) {
      const project = r.projectName ?? '—';
      // eslint-disable-next-line no-await-in-loop
      const members = await getGroupMemberNames(r.groupId);
      const msg = buildAuditReportReminderMessage(r.auditorLogin, project, members);
      // eslint-disable-next-line no-await-in-loop
      const bot = await notifyViaBot({
        type: 'audit_report',
        recipientDiscordId: discordId,
        title: 'Rappel — rapport d\'audit',
        body: msg,
        facts: [
          { name: 'Auditeur', value: r.auditorLogin },
          { name: 'Projet', value: project },
          { name: 'Groupe audité', value: members || '—' },
        ],
        actions: { bookButton: false, replyButton: true },
        context: {
          type: 'audit_report',
          source_label: "Rapport d'audit",
          auditorLogin: r.auditorLogin,
          groupId: r.groupId,
          members,
          projectName: project,
        },
      });
      // eslint-disable-next-line no-await-in-loop
      dmSent = bot.ok ? true : await sendDiscordDM(discordId, msg);
    }

    if (teamsOk) {
      // eslint-disable-next-line no-await-in-loop
      await markAuditEscalated(r.id);
      escalated.push({ id: r.id, auditorLogin: r.auditorLogin, dmSent });
    } else {
      errors.push({ id: r.id, auditorLogin: r.auditorLogin });
    }
  }

  // 2e relance Discord (backlog > 14 j). On marque second_reminder_at même
  // sans Discord lié (rien d'autre à faire côté DM ; l'auditeur reste visible
  // dans le récap) — sinon la cible serait retentée à chaque run pour rien.
  const secondReminders: { id: number; auditorLogin: string; dmSent: boolean }[] = [];
  for (const t of secondTargets) {
    let dmSent = false;
    // eslint-disable-next-line no-await-in-loop
    const discordId = await getDiscordIdByLogin(t.auditorLogin);
    if (discordId) {
      const project = t.projectName ?? '—';
      // eslint-disable-next-line no-await-in-loop
      const members = await getGroupMemberNames(t.groupId);
      const msg = buildAuditReportSecondReminderMessage(t.auditorLogin, project, members);
      // eslint-disable-next-line no-await-in-loop
      const bot = await notifyViaBot({
        type: 'audit_report',
        recipientDiscordId: discordId,
        title: 'Dernière relance — rapport d\'audit',
        body: msg,
        facts: [
          { name: 'Auditeur', value: t.auditorLogin },
          { name: 'Projet', value: project },
          { name: 'Groupe audité', value: members || '—' },
        ],
        actions: { bookButton: false, replyButton: true },
        context: {
          type: 'audit_report',
          source_label: "Rapport d'audit",
          auditorLogin: t.auditorLogin,
          groupId: t.groupId,
          members,
          projectName: project,
        },
      });
      // eslint-disable-next-line no-await-in-loop
      dmSent = bot.ok ? true : await sendDiscordDM(discordId, msg);
    }
    // eslint-disable-next-line no-await-in-loop
    await markSecondReminderSent(t.id);
    secondReminders.push({ id: t.id, auditorLogin: t.auditorLogin, dmSent });
  }

  // Visibilité staff : une petite carte Teams (Canal 2) résumant le lot.
  if (secondReminders.length > 0) {
    const sentCount = secondReminders.filter((r) => r.dmSent).length;
    const noDiscord = secondReminders.filter((r) => !r.dmSent);
    await sendTeamsFormsCard(
      buildAdaptiveCard([
        textBlock('🔔 2e relance rapports d\'audit', { size: 'Large', weight: 'Bolder' }),
        textBlock(
          `${sentCount}/${secondReminders.length} auditeur(s) recontactés en DM (backlog > 14 j sans réponse).`,
          { isSubtle: true },
        ),
        ...(noDiscord.length > 0
          ? [
              textBlock(
                `Sans Discord lié (à voir en direct) : ${noDiscord.map((r) => r.auditorLogin).join(', ')}`,
                { wrap: true },
              ),
            ]
          : []),
      ]),
    );
  }

  // Carte récap (une seule, best-effort) si des relances restent sans réponse.
  let recapSent = false;
  if (recap.items.length > 0) {
    recapSent = await sendTeamsFormsCard(
      buildEscalatedUnansweredRecapCard({
        items: recap.items,
        olderCount: recap.olderCount,
        suiviUrl,
      }),
    );
  }

  return NextResponse.json({
    success: true,
    checked: requests.length,
    escalated,
    errors,
    secondReminders,
    recap: { count: recap.items.length, older: recap.olderCount, sent: recapSent },
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
