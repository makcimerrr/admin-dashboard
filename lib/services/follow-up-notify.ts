import 'server-only';
import { makeLog } from '@/lib/log';
import { isMailerConfigured, sendMail } from './mailer';
import {
  buildAdaptiveCard,
  factSet,
  isTeamsConfigured,
  openUrlAction,
  sendTeamsCard,
  textBlock,
} from './teams';
import {
  getFollowUpSettings,
  recordReminder,
  setMilestoneStatus,
  type MilestoneRow,
} from '@/lib/db/services/followUps';
import type { FollowUpSettings, ReminderKind } from '@/lib/db/schema/followUps';
import {
  DEFAULT_BODY_TEMPLATE,
  DEFAULT_SUBJECT_TEMPLATE,
  renderTemplate,
  textToHtml,
} from './follow-up-templates';

export {
  DEFAULT_BODY_TEMPLATE,
  DEFAULT_SUBJECT_TEMPLATE,
  TEMPLATE_VARIABLES,
  renderTemplate,
} from './follow-up-templates';

const log = makeLog('follow-up-notify');

/**
 * Relances « suivi en entreprise » : mail au tuteur + alerte interne Teams.
 *
 * Deux garde-fous, volontaires :
 *  - `autoSendEnabled` (réglages du module) : kill-switch, OFF par défaut. Les
 *    envois AUTOMATIQUES sont bloqués tant qu'il n'est pas activé. Une relance
 *    déclenchée à la main depuis le hub passe outre (c'est un acte explicite).
 *  - chaque envoi est tracé dans `follow_up_reminders` (date, destinataire,
 *    canal, auteur) → pas de doublon, et une trace auditable.
 */

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function buildTemplateVars(
  milestone: MilestoneRow,
  settings: FollowUpSettings,
): Record<string, string> {
  return {
    tuteur: milestone.tutorName?.trim() || 'Madame, Monsieur',
    apprenant: `${milestone.firstName} ${milestone.lastName}`,
    promo: milestone.promoName,
    entreprise: milestone.companyName,
    jalon: milestone.typeLabel,
    date_debut: formatDate(milestone.contractStart),
    date_fin: formatDate(milestone.contractEnd),
    date_echeance: formatDate(milestone.dueDate),
    lien_rdv: settings.bookingUrl || '(lien de réservation à configurer)',
    expediteur: settings.senderName || 'L’équipe pédagogique',
  };
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export function renderTutorEmail(
  milestone: MilestoneRow,
  settings: FollowUpSettings,
): RenderedEmail {
  const vars = buildTemplateVars(milestone, settings);
  const subject = renderTemplate(
    settings.emailSubjectTemplate || DEFAULT_SUBJECT_TEMPLATE,
    vars,
  );
  const text = renderTemplate(settings.emailBodyTemplate || DEFAULT_BODY_TEMPLATE, vars);

  // HTML minimal (meilleure délivrabilité qu'un template lourd).
  return { subject, text, html: textToHtml(text) };
}

// ─── Envoi d'une relance tuteur ──────────────────────────────────────────────

export interface SendReminderResult {
  ok: boolean;
  skipped?: 'no_email' | 'auto_disabled' | 'mailer_unconfigured';
  error?: string;
}

/**
 * Envoie la relance à un tuteur, trace l'envoi et bascule l'échéance en
 * `relance_envoyee`. Un échec est tracé aussi (statut 'failed') pour pouvoir
 * réessayer sans perdre l'information.
 */
export async function sendMilestoneReminder(
  milestone: MilestoneRow,
  { kind, sentBy }: { kind: ReminderKind; sentBy: string },
): Promise<SendReminderResult> {
  const settings = await getFollowUpSettings();

  if (kind !== 'manual' && !settings.autoSendEnabled) {
    return { ok: false, skipped: 'auto_disabled' };
  }
  if (!milestone.tutorEmail?.trim()) {
    return { ok: false, skipped: 'no_email' };
  }
  if (!isMailerConfigured()) {
    return { ok: false, skipped: 'mailer_unconfigured' };
  }

  const { subject, text, html } = renderTutorEmail(milestone, settings);
  const result = await sendMail({
    to: milestone.tutorEmail.trim(),
    subject,
    text,
    html,
    replyTo: settings.replyToEmail || settings.senderEmail || undefined,
    from:
      settings.senderName && settings.senderEmail
        ? `${settings.senderName} <${settings.senderEmail}>`
        : undefined,
  });

  await recordReminder({
    milestoneId: milestone.id,
    channel: 'email',
    kind,
    recipient: milestone.tutorEmail.trim(),
    subject,
    sentBy,
    status: result.ok ? 'sent' : 'failed',
    error: result.error,
  });

  if (result.ok && milestone.status === 'a_venir') {
    await setMilestoneStatus(milestone.id, 'relance_envoyee');
  }

  return { ok: result.ok, error: result.error };
}

// ─── Alerte interne (Teams) ──────────────────────────────────────────────────

function hubUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://hub.zone01normandie.org';
  return `${base}${path}`;
}

/**
 * Digest interne : les échéances qui arrivent et celles en retard. Une seule
 * carte par exécution du cron — on ne spamme pas le canal.
 */
export async function sendInternalDigest(
  { overdue, upcoming }: { overdue: MilestoneRow[]; upcoming: MilestoneRow[] },
): Promise<boolean> {
  const settings = await getFollowUpSettings();
  if (!settings.teamsAlertsEnabled || !isTeamsConfigured()) return false;
  if (overdue.length === 0 && upcoming.length === 0) return false;

  const body = [
    textBlock('Suivi en entreprise — échéances à traiter', { size: 'Large', weight: 'Bolder' }),
  ];

  if (overdue.length > 0) {
    body.push(
      textBlock(`⚠️ ${overdue.length} échéance(s) en retard`, {
        weight: 'Bolder',
        color: 'Attention',
      }),
    );
    body.push(
      factSet(
        overdue.slice(0, 10).map((m) => ({
          title: `${m.firstName} ${m.lastName}`,
          value: `${m.typeLabel} · ${m.companyName} · ${Math.abs(m.daysUntilDue)} j de retard`,
        })),
      ),
    );
    if (overdue.length > 10) {
      body.push(textBlock(`…et ${overdue.length - 10} autre(s).`, { isSubtle: true }));
    }
  }

  if (upcoming.length > 0) {
    body.push(
      textBlock(`📅 ${upcoming.length} échéance(s) à venir`, {
        weight: 'Bolder',
        spacing: 'Medium',
      }),
    );
    body.push(
      factSet(
        upcoming.slice(0, 10).map((m) => ({
          title: `${m.firstName} ${m.lastName}`,
          value: `${m.typeLabel} · ${m.companyName} · dans ${m.daysUntilDue} j`,
        })),
      ),
    );
    if (upcoming.length > 10) {
      body.push(textBlock(`…et ${upcoming.length - 10} autre(s).`, { isSubtle: true }));
    }
  }

  const card = buildAdaptiveCard(body, [
    openUrlAction('Ouvrir le suivi', hubUrl('/alternants?tab=suivi')),
  ]);

  const sent = await sendTeamsCard(card);
  if (!sent) log.warn('digest Teams non envoyé');
  return sent;
}
