import 'server-only';
import { makeLog } from '@/lib/log';
import {
  buildAdaptiveCard,
  factSet,
  isTeamsConfigured,
  openUrlAction,
  sendTeamsCard,
  textBlock,
  type AdaptiveElement,
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
 * RÈGLE ABSOLUE : aucun mail ne part vers une entreprise partenaire sans
 * confirmation humaine explicite. Le hub n'ENVOIE d'ailleurs aucun mail : il
 * prépare le message, l'ouvre dans la messagerie de l'utilisateur (`mailto:`),
 * et enregistre la relance quand celui-ci confirme l'avoir envoyée.
 *
 * Ce choix vaut mieux qu'un SMTP côté serveur : le mail part de la boîte réelle
 * de la personne, donc les réponses du tuteur lui reviennent directement et la
 * conversation reste là où elle doit être.
 *
 * `recordMilestoneReminder()` exige `confirmedBy` (l'email de l'utilisateur hub
 * qui valide) : impossible de tracer une relance « au nom de personne ».
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
  /** Texte brut : c'est ce que la messagerie de l'utilisateur recevra. */
  text: string;
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
  return { subject, text };
}

// ─── Envoi d'une relance tuteur ──────────────────────────────────────────────

export interface RecordReminderResult {
  ok: boolean;
  skipped?: 'no_email';
}

export interface RecordReminderInput {
  kind: ReminderKind;
  /**
   * Email de l'utilisateur hub qui déclare avoir envoyé le mail. Obligatoire :
   * c'est toute la valeur de la trace — savoir QUI a relancé, et quand.
   */
  confirmedBy: string;
  /** Objet réellement envoyé (relu, éventuellement corrigé). */
  subject?: string;
}

/**
 * Enregistre une relance que l'utilisateur vient d'envoyer depuis SA messagerie,
 * et bascule l'échéance en `relance_envoyee`.
 *
 * Le hub ne peut pas vérifier qu'un `mailto:` a effectivement abouti : la trace
 * reflète donc une DÉCLARATION humaine, pas un accusé technique. C'est assumé —
 * mieux vaut une trace datée et attribuée qu'un envoi automatique que personne
 * n'a relu.
 */
export async function recordMilestoneReminder(
  milestone: MilestoneRow,
  { kind, confirmedBy, subject }: RecordReminderInput,
): Promise<RecordReminderResult> {
  if (!confirmedBy?.trim()) {
    throw new Error('recordMilestoneReminder : confirmedBy est obligatoire');
  }
  if (!milestone.tutorEmail?.trim()) {
    return { ok: false, skipped: 'no_email' };
  }

  const settings = await getFollowUpSettings();
  const rendered = renderTutorEmail(milestone, settings);

  await recordReminder({
    milestoneId: milestone.id,
    channel: 'email',
    kind,
    recipient: milestone.tutorEmail.trim(),
    subject: subject?.trim() || rendered.subject,
    sentBy: confirmedBy,
    status: 'sent',
  });

  if (milestone.status === 'a_venir') {
    await setMilestoneStatus(milestone.id, 'relance_envoyee');
  }

  return { ok: true };
}

// ─── Alerte interne (Teams) ──────────────────────────────────────────────────

/** Date courte pour les cartes Teams (jj/mm). */
function fmtShort(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function hubUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://hub.zone01normandie.org';
  return `${base}${path}`;
}

/**
 * Digest interne : ce qu'il y a à traiter, et surtout les relances EN ATTENTE
 * DE CONFIRMATION — le hub ne les envoie pas tout seul, il vient les chercher.
 * Une seule carte par exécution du cron : on ne spamme pas le canal.
 */
export async function sendInternalDigest({
  overdue,
  upcoming,
  toConfirm = [],
  missingTutorEmail = [],
}: {
  overdue: MilestoneRow[];
  upcoming: MilestoneRow[];
  toConfirm?: MilestoneRow[];
  missingTutorEmail?: MilestoneRow[];
}): Promise<boolean> {
  const settings = await getFollowUpSettings();
  if (!settings.teamsAlertsEnabled || !isTeamsConfigured()) return false;
  if (overdue.length === 0 && upcoming.length === 0 && toConfirm.length === 0) return false;

  /** Liste compacte, tronquée à 10 lignes pour rester lisible dans Teams. */
  const listOf = (items: MilestoneRow[], value: (m: MilestoneRow) => string) => {
    const elements: AdaptiveElement[] = [
      factSet(
        items.slice(0, 10).map((m) => ({
          title: `${m.firstName} ${m.lastName}`,
          value: value(m),
        })),
      ),
    ];
    if (items.length > 10) {
      elements.push(textBlock(`…et ${items.length - 10} autre(s).`, { isSubtle: true }));
    }
    return elements;
  };

  const body: AdaptiveElement[] = [
    textBlock('Suivi en entreprise — à traiter', { size: 'Large', weight: 'Bolder' }),
  ];

  if (toConfirm.length > 0) {
    body.push(
      textBlock(`✉️ ${toConfirm.length} relance(s) à relire et confirmer`, {
        weight: 'Bolder',
        color: 'Accent',
      }),
      textBlock('Aucun mail n’est parti : ils attendent votre validation sur le hub.', {
        isSubtle: true,
      }),
      ...listOf(toConfirm, (m) => `${m.typeLabel} · ${m.companyName} · échéance ${fmtShort(m.dueDate)}`),
    );
  }

  if (overdue.length > 0) {
    body.push(
      textBlock(`⚠️ ${overdue.length} échéance(s) en retard`, {
        weight: 'Bolder',
        color: 'Attention',
        spacing: 'Medium',
      }),
      ...listOf(overdue, (m) => `${m.typeLabel} · ${m.companyName} · ${Math.abs(m.daysUntilDue)} j de retard`),
    );
  }

  if (upcoming.length > 0) {
    body.push(
      textBlock(`📅 ${upcoming.length} échéance(s) à venir`, {
        weight: 'Bolder',
        spacing: 'Medium',
      }),
      ...listOf(upcoming, (m) => `${m.typeLabel} · ${m.companyName} · dans ${m.daysUntilDue} j`),
    );
  }

  if (missingTutorEmail.length > 0) {
    body.push(
      textBlock(
        `🚫 ${missingTutorEmail.length} contrat(s) sans email de tuteur — relance impossible tant que la fiche n'est pas complétée.`,
        { color: 'Warning', spacing: 'Medium' },
      ),
    );
  }

  const card = buildAdaptiveCard(body, [
    openUrlAction('Ouvrir le suivi', hubUrl('/alternants?tab=suivi')),
  ]);

  const sent = await sendTeamsCard(card);
  if (!sent) log.warn('digest Teams non envoyé');
  return sent;
}
