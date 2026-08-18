import { NextRequest, NextResponse } from 'next/server';
import { makeLog } from '@/lib/log';
import {
  getFollowUpSettings,
  linkOrphanReportsToMilestones,
  listMilestones,
  reconcileMilestones,
  type MilestoneRow,
} from '@/lib/db/services/followUps';
import { sendInternalDigest } from '@/lib/services/follow-up-notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const CRON_SECRET = process.env.CRON_SECRET;
const log = makeLog('cron:follow-up-digest');

/**
 * Cron quotidien du suivi en entreprise.
 *
 * ⚠️ Ce cron n'envoie AUCUN mail à une entreprise. Il ne fait que :
 *
 *  1. RÉCONCILIER — reposer les échéances manquantes (nouveau contrat, dates
 *     corrigées, jalon reconfiguré), et rattacher les comptes rendus orphelins
 *     à l'échéance qu'ils clôturent. Idempotent.
 *  2. SIGNALER EN INTERNE — une carte Teams récapitulant les retards, les
 *     échéances proches et les relances à confirmer, avec un lien vers le hub.
 *
 * Chaque mail au tuteur part d'un clic humain dans l'UI, après relecture du
 * message (cf. `sendMilestoneReminder`, qui exige `confirmedBy`). Ce cron
 * remplace la charge mentale, pas la décision.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const querySecret = request.nextUrl.searchParams.get('secret');
  const providedSecret = authHeader?.replace('Bearer ', '') || querySecret;

  if (!CRON_SECRET || providedSecret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  // `?dry=true` : calcule et renvoie l'état sans poster la carte Teams.
  const dry = request.nextUrl.searchParams.get('dry') === 'true';

  const settings = await getFollowUpSettings();
  const reconciled = await reconcileMilestones();
  // Un compte rendu saisi hors échéance clôt l'échéance qu'il documente.
  const linkedReports = await linkOrphanReportsToMilestones();

  const open = await listMilestones();
  const now = Date.now();

  /** Échéance entrée dans la fenêtre de relance et jamais relancée. */
  const awaitingFirstReminder = (m: MilestoneRow) =>
    m.status === 'a_venir' && m.reminderCount === 0 && m.daysUntilDue <= settings.reminderLeadDays;

  /** Relance partie, toujours pas de RDV après le délai configuré. */
  const awaitingFollowUpReminder = (m: MilestoneRow) =>
    m.status === 'relance_envoyee' &&
    m.lastReminderAt !== null &&
    (now - new Date(m.lastReminderAt).getTime()) / 86_400_000 >=
      settings.secondReminderAfterDays;

  const toConfirm = open.filter(
    (m) => awaitingFirstReminder(m) || awaitingFollowUpReminder(m),
  );
  const overdue = open.filter((m) => m.daysUntilDue < 0);
  const upcoming = open.filter(
    (m) => m.daysUntilDue >= 0 && m.daysUntilDue <= settings.internalAlertLeadDays,
  );
  /** Signalé à part : sans email de tuteur, aucune relance n'est possible. */
  const missingTutorEmail = toConfirm.filter((m) => !m.tutorEmail?.trim());

  const digestSent = dry
    ? false
    : await sendInternalDigest({ overdue, upcoming, toConfirm, missingTutorEmail });

  const summary = {
    dry,
    reconciled,
    linkedReports,
    openMilestones: open.length,
    /** Relances proposées — AUCUNE n'est envoyée par ce cron. */
    toConfirm: toConfirm.map((m) => ({
      id: m.id,
      student: `${m.firstName} ${m.lastName}`,
      company: m.companyName,
      milestone: m.typeLabel,
      dueDate: m.dueDate,
      tutorEmail: m.tutorEmail,
      remindersSent: m.reminderCount,
    })),
    overdue: overdue.length,
    upcoming: upcoming.length,
    missingTutorEmail: missingTutorEmail.length,
    digestSent,
  };

  log.info('digest calculé (aucun envoi tuteur)', summary);
  return NextResponse.json({ success: true, ...summary });
}
