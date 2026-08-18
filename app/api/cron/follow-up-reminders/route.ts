import { NextRequest, NextResponse } from 'next/server';
import { makeLog } from '@/lib/log';
import {
  getFollowUpSettings,
  getRemindersForMilestone,
  listMilestones,
  reconcileMilestones,
  type MilestoneRow,
} from '@/lib/db/services/followUps';
import { sendInternalDigest, sendMilestoneReminder } from '@/lib/services/follow-up-notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const CRON_SECRET = process.env.CRON_SECRET;
const log = makeLog('cron:follow-up-reminders');

/**
 * Cron quotidien du suivi en entreprise. Trois temps :
 *
 *  1. RÉCONCILIATION — repose les échéances manquantes (nouveau contrat,
 *     dates corrigées, jalon reconfiguré). Idempotent.
 *  2. RELANCES TUTEURS — mail automatique `reminderLeadDays` jours avant
 *     l'échéance, puis 2e relance après `secondReminderAfterDays` sans RDV.
 *     Bloqué tant que `autoSendEnabled` est OFF (kill-switch par défaut).
 *  3. DIGEST INTERNE — une carte Teams récapitulant retards et échéances
 *     proches, pour que le suivi ne repose plus sur la mémoire d'une personne.
 *
 * Rejouable sans risque : l'anti-doublon s'appuie sur `follow_up_reminders`.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const querySecret = request.nextUrl.searchParams.get('secret');
  const providedSecret = authHeader?.replace('Bearer ', '') || querySecret;

  if (!CRON_SECRET || providedSecret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  // `?dry=true` : calcule et renvoie ce qui SERAIT envoyé, sans rien envoyer.
  const dry = request.nextUrl.searchParams.get('dry') === 'true';

  const settings = await getFollowUpSettings();
  const reconciled = await reconcileMilestones();

  const open = await listMilestones();
  const now = Date.now();

  /** Une échéance déjà relancée récemment ne doit pas l'être à nouveau. */
  const needsFirstReminder = (m: MilestoneRow) =>
    m.status === 'a_venir' &&
    m.reminderCount === 0 &&
    m.daysUntilDue <= settings.reminderLeadDays;

  const needsSecondReminder = (m: MilestoneRow) =>
    m.status === 'relance_envoyee' &&
    m.reminderCount === 1 &&
    m.lastReminderAt !== null &&
    (now - new Date(m.lastReminderAt).getTime()) / 86_400_000 >=
      settings.secondReminderAfterDays;

  const toRemind = open.filter((m) => needsFirstReminder(m) || needsSecondReminder(m));

  const sent: number[] = [];
  const skipped: { id: number; reason: string }[] = [];

  if (!dry) {
    for (const milestone of toRemind) {
      // Garde-fou : relire les relances de CETTE échéance juste avant l'envoi
      // évite un doublon si deux exécutions se chevauchent.
      const already = await getRemindersForMilestone(milestone.id);
      const sameKind = already.filter(
        (r) =>
          r.status === 'sent' &&
          (now - new Date(r.sentAt).getTime()) / 86_400_000 <
            settings.secondReminderAfterDays,
      );
      if (sameKind.length > 0) {
        skipped.push({ id: milestone.id, reason: 'relance récente déjà tracée' });
        continue;
      }

      const result = await sendMilestoneReminder(milestone, {
        kind: needsSecondReminder(milestone) ? 'relance' : 'auto',
        sentBy: 'cron',
      });
      if (result.ok) sent.push(milestone.id);
      else skipped.push({ id: milestone.id, reason: result.skipped ?? result.error ?? 'échec' });
    }
  }

  // 3) Digest interne : retards + échéances dans la fenêtre d'alerte.
  const overdue = open.filter((m) => m.daysUntilDue < 0);
  const upcoming = open.filter(
    (m) => m.daysUntilDue >= 0 && m.daysUntilDue <= settings.internalAlertLeadDays,
  );
  const digestSent = dry ? false : await sendInternalDigest({ overdue, upcoming });

  const summary = {
    dry,
    autoSendEnabled: settings.autoSendEnabled,
    reconciled,
    openMilestones: open.length,
    candidates: toRemind.map((m) => ({
      id: m.id,
      student: `${m.firstName} ${m.lastName}`,
      company: m.companyName,
      milestone: m.typeLabel,
      dueDate: m.dueDate,
      tutorEmail: m.tutorEmail,
    })),
    sent: sent.length,
    skipped,
    overdue: overdue.length,
    upcoming: upcoming.length,
    digestSent,
  };

  log.info('exécution terminée', summary);
  return NextResponse.json({ success: true, ...summary });
}
