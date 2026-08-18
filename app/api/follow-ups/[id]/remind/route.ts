import type { NextRequest } from 'next/server';
import { withAdmin, withErrorHandler, apiSuccess, apiError } from '@/lib/api';
import { getFollowUpSettings, getMilestoneById } from '@/lib/db/services/followUps';
import { renderTutorEmail, sendMilestoneReminder } from '@/lib/services/follow-up-notify';
import { isMailerConfigured } from '@/lib/services/mailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/follow-ups/[id]/remind — prévisualise le mail qui SERAIT envoyé au
 * tuteur (sujet + corps rendus avec les vraies valeurs). Aucun envoi.
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
    });
  }),
);

/**
 * POST /api/follow-ups/[id]/remind — relance MANUELLE du tuteur.
 *
 * Acte explicite : passe outre le kill-switch `autoSendEnabled` (qui ne
 * concerne que les envois automatiques du cron), mais reste tracé dans
 * `follow_up_reminders`.
 */
export const POST = withErrorHandler(
  withAdmin<Ctx>(async (_req: NextRequest, { params, user }) => {
    const milestone = await getMilestoneById(Number((await params).id));
    if (!milestone) return apiError('NOT_FOUND', 'Échéance introuvable');

    const result = await sendMilestoneReminder(milestone, {
      kind: 'manual',
      sentBy: user.email,
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

    return apiSuccess({ sent: true, to: milestone.tutorEmail });
  }),
);
