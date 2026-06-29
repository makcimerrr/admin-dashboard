import type { NextRequest } from 'next/server';
import { db } from '@/lib/db/config';
import { groupStatuses } from '@/lib/db/schema/groupStatuses';
import { eq } from 'drizzle-orm';
import { getDiscordIdByLogin } from '@/lib/db/services/discordUsers';
import { sendDiscordDM } from '@/lib/services/discord';
import { getAllPromotions } from '@/lib/config/promotions';
import { getTrackByProjectName } from '@/lib/config/projects';
import { getReviewerForRoundRobin } from '@/lib/db/services/reviewers';
import { getNotifiedCount } from '@/lib/db/services/groupStatuses';
import { apiError, apiSuccess, withAuth, withErrorHandler } from '@/lib/api';

export const POST = withErrorHandler(
  withAuth(async (request: NextRequest) => {
    const { groupStatusId } = await request.json();
    if (!groupStatusId) return apiError('BAD_REQUEST', 'groupStatusId requis');

    const rows = await db
      .select()
      .from(groupStatuses)
      .where(eq(groupStatuses.id, Number(groupStatusId)))
      .limit(1);

    const row = rows[0];
    if (!row) return apiError('NOT_FOUND', 'Groupe non trouvé');

    // Soft failures (not HTTP errors — the caller can react with a toast)
    if (!row.captainLogin) {
      return apiSuccess({ sent: false, reason: 'no_captain' as const });
    }
    const discordId = await getDiscordIdByLogin(row.captainLogin);
    if (!discordId) {
      return apiSuccess({ sent: false, reason: 'no_discord' as const });
    }

    // Build DM
    const promotions = await getAllPromotions();
    const promo = promotions.find((p) => String(p.eventId) === row.promoId);
    const promoName = promo?.title ?? promo?.key ?? row.promoId;

    const track = await getTrackByProjectName(row.projectName);
    const notifiedCount = await getNotifiedCount();
    const reviewer = await getReviewerForRoundRobin(track, notifiedCount);

    const planningLine = reviewer
      ? `Réserve ton créneau avec **${reviewer.name}** :\n📅 ${reviewer.planningUrl}`
      : `Contacte le staff pour réserver un créneau.`;

    const message = [
      `Hey ${row.captainLogin} ! 👋`,
      ``,
      `Rappel : ton groupe est en attente de code-review pour **${row.projectName}** (${promoName}).`,
      ``,
      planningLine,
      ``,
      `N'oublie pas de prévenir tes coéquipiers. Bonne chance ! 💪`,
    ].join('\n');

    const sent = await sendDiscordDM(discordId, message);
    if (!sent) return apiError('INTERNAL_ERROR', "Échec de l'envoi du DM Discord");

    await db
      .update(groupStatuses)
      .set({
        manualReminderAt: new Date(),
        // Première notification : on marque le groupe comme notifié (le badge
        // « Non notifié » disparaît). Les relances suivantes gardent la date
        // d'origine et ne mettent à jour que manualReminderAt.
        ...(row.notifiedAuditAt ? {} : { notifiedAuditAt: new Date() }),
        ...(reviewer ? { notifiedReviewerName: reviewer.name } : {}),
      })
      .where(eq(groupStatuses.id, Number(groupStatusId)));

    return apiSuccess({ sent: true });
  }),
);
