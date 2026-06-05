import { NextRequest, NextResponse } from 'next/server';
import {
  getFinishedAuditorsToRequest,
  recordAuditReportRequest,
  buildAuditReportMessage,
} from '@/lib/db/services/auditReports';
import { sendDiscordDM } from '@/lib/services/discord';
import { notifyViaBot } from '@/lib/services/bot-notify';

export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Chantier D (auto) — déclenché par cron (VPS). Pour chaque groupe passé
 * `finished` sur les derniers jours, DM les auditeurs (avec Discord lié, pas
 * déjà sollicités) pour demander leur compte-rendu d'audit. Idempotent grâce à
 * audit_report_requests.
 *
 * Auth : Authorization: Bearer <CRON_SECRET> ou ?secret=.
 * ?dry=1  : liste les envois prévus sans rien envoyer.
 * ?seed=1 : marque les candidats comme déjà demandés SANS envoyer (baseline,
 *           pour ne déclencher que sur les futures transitions audit→finished).
 * ?sinceDays=N : fenêtre (défaut 7 ; pour le seed initial, mettre large).
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
  const seed = request.nextUrl.searchParams.get('seed') === '1';
  const sinceDays = Number(request.nextUrl.searchParams.get('sinceDays') ?? 7);

  const targets = await getFinishedAuditorsToRequest(Number.isFinite(sinceDays) ? sinceDays : 7);

  if (dry) {
    return NextResponse.json({
      success: true,
      dry: true,
      count: targets.length,
      targets: targets.map((t) => ({ auditorLogin: t.auditorLogin, project: t.project, groupId: t.groupId })),
    });
  }

  // Baseline : enregistre sans envoyer, pour ne déclencher que sur les futures
  // transitions vers finished.
  if (seed) {
    for (const t of targets) {
      // eslint-disable-next-line no-await-in-loop
      await recordAuditReportRequest(t.auditorLogin, t.groupId, t.project);
    }
    return NextResponse.json({ success: true, seeded: targets.length });
  }

  let sent = 0;
  const errors: { auditorLogin: string; groupId: string }[] = [];
  for (const t of targets) {
    const message = buildAuditReportMessage(t.auditorLogin, t.project);
    // Émission via le bot (bouton Répondre uniquement). Fallback DM texte.
    // eslint-disable-next-line no-await-in-loop
    const bot = await notifyViaBot({
      type: 'audit_report',
      recipientDiscordId: t.discordId,
      title: 'Rapport d\'audit demandé',
      body: message,
      facts: [
        { name: 'Auditeur', value: t.auditorLogin },
        { name: 'Projet', value: t.project },
      ],
      actions: { rdvReaction: false, replyButton: true },
      context: {
        type: 'audit_report',
        source_label: "Rapport d'audit",
        auditorLogin: t.auditorLogin,
        groupId: t.groupId,
        projectName: t.project,
      },
    });
    // eslint-disable-next-line no-await-in-loop
    const ok = bot.ok ? true : await sendDiscordDM(t.discordId, message);
    if (ok) {
      // eslint-disable-next-line no-await-in-loop
      await recordAuditReportRequest(t.auditorLogin, t.groupId, t.project);
      sent += 1;
    } else {
      errors.push({ auditorLogin: t.auditorLogin, groupId: t.groupId });
    }
  }

  return NextResponse.json({ success: true, candidates: targets.length, sent, errors });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
