import type { NextRequest } from 'next/server';
import { withAdmin, withErrorHandler, apiSuccess, apiError } from '@/lib/api';
import { getFollowUpSettings, getMilestoneById } from '@/lib/db/services/followUps';
import { renderTutorEmail, sendMilestoneReminder } from '@/lib/services/follow-up-notify';
import { isMailerConfigured } from '@/lib/services/mailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/follow-ups/[id]/remind — prépare le mail à relire AVANT envoi
 * (sujet + corps rendus avec les vraies valeurs). Aucun envoi, jamais.
 *
 * C'est la première moitié du geste en deux temps : on relit, puis on confirme.
 */
export const GET = withErrorHandler(
  withAdmin<Ctx>(async (_req: NextRequest, { params }) => {
    const milestone = await getMilestoneById(Number((await params).id));
    if (!milestone) return apiError('NOT_FOUND', 'Échéance introuvable');

    const settings = await getFollowUpSettings();
    const { subject, text } = renderTutorEmail(milestone, settings);

    return apiSuccess({
      to: milestone.tutorEmail,
      subject,
      body: text,
      mailerConfigured: isMailerConfigured(),
      bookingUrlConfigured: Boolean(settings.bookingUrl),
      /** Nombre de relances déjà parties — affiché avant de confirmer. */
      remindersSent: milestone.reminderCount,
    });
  }),
);

/**
 * POST /api/follow-ups/[id]/remind — envoi de la relance, APRÈS confirmation
 * humaine dans l'UI.
 *
 * Body optionnel : { subject, body } — le texte relu et éventuellement corrigé
 * dans l'écran de confirmation. Sans eux, le modèle configuré s'applique.
 *
 * Il n'existe aucun autre chemin d'envoi : les crons ne postent jamais de mail
 * à une entreprise. `user.email` (l'utilisateur authentifié qui confirme) est
 * tracé dans `follow_up_reminders.sent_by`.
 */
export const POST = withErrorHandler(
  withAdmin<Ctx>(async (req: NextRequest, { params, user }) => {
    const milestone = await getMilestoneById(Number((await params).id));
    if (!milestone) return apiError('NOT_FOUND', 'Échéance introuvable');

    const body = (await req.json().catch(() => ({}))) as {
      subject?: string;
      body?: string;
    };

    const result = await sendMilestoneReminder(milestone, {
      // 1er envoi = 'manual', les suivants = 'relance'.
      kind: milestone.reminderCount > 0 ? 'relance' : 'manual',
      confirmedBy: user.email,
      subject: body.subject,
      body: body.body,
    });

    if (!result.ok) {
      const message =
        result.skipped === 'no_email'
          ? "Aucun email de tuteur renseigné sur ce contrat"
          : result.skipped === 'mailer_unconfigured'
            ? 'SMTP non configuré côté serveur (SMTP_HOST / SMTP_USER / SMTP_PASSWORD)'
            : (result.error ?? "L'envoi a échoué");
      return apiError('BAD_REQUEST', message);
    }

    return apiSuccess({ sent: true, to: milestone.tutorEmail, confirmedBy: user.email });
  }),
);
