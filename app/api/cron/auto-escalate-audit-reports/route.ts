import { NextRequest, NextResponse } from 'next/server';
import {
  getAuditRequestsToEscalate,
  markAuditEscalated,
  buildAuditReportReminderMessage,
  getGroupMemberNames,
} from '@/lib/db/services/auditReports';
import { sendTeamsFormsCard, buildEscalationCard } from '@/lib/services/teams';
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

  return NextResponse.json({
    success: true,
    checked: requests.length,
    escalated,
    errors,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
