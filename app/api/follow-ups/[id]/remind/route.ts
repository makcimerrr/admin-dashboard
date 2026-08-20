import type { NextRequest } from 'next/server';
import { withAdmin, withErrorHandler, apiSuccess, apiError } from '@/lib/api';
import { getFollowUpSettings, getMilestoneById } from '@/lib/db/services/followUps';
import { recordMilestoneReminder, renderTutorEmail } from '@/lib/services/follow-up-notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/follow-ups/[id]/remind — prépare le mail à relire avant envoi.
 *
 * Le hub n'envoie rien lui-même : il rend l'objet et le corps, que l'UI ouvre
 * dans la messagerie de l'utilisateur (`mailto:`). Le mail part ainsi de sa
 * boîte réelle, et les réponses du tuteur lui reviennent directement.
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
      bookingUrlConfigured: Boolean(settings.bookingUrl),
      /** Nombre de relances déjà parties — affiché avant de confirmer. */
      remindersSent: milestone.reminderCount,
    });
  }),
);

/**
 * POST /api/follow-ups/[id]/remind — enregistre la relance que l'utilisateur
 * vient d'envoyer depuis sa messagerie, et passe l'échéance en « relance
 * envoyée ».
 *
 * Body optionnel : { subject } — l'objet réellement utilisé.
 *
 * Ce n'est pas un accusé de réception technique : le hub ne peut pas savoir si
 * le `mailto:` a abouti. La trace reflète une DÉCLARATION humaine, datée et
 * attribuée à `user.email`.
 */
export const POST = withErrorHandler(
  withAdmin<Ctx>(async (req: NextRequest, { params, user }) => {
    const milestone = await getMilestoneById(Number((await params).id));
    if (!milestone) return apiError('NOT_FOUND', 'Échéance introuvable');

    const body = (await req.json().catch(() => ({}))) as { subject?: string };

    const result = await recordMilestoneReminder(milestone, {
      // 1er envoi = 'manual', les suivants = 'relance'.
      kind: milestone.reminderCount > 0 ? 'relance' : 'manual',
      confirmedBy: user.email,
      subject: body.subject,
    });

    if (!result.ok) {
      return apiError('BAD_REQUEST', "Aucun email de tuteur renseigné sur ce contrat");
    }

    return apiSuccess({ recorded: true, to: milestone.tutorEmail, confirmedBy: user.email });
  }),
);
