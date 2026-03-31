import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/stack-server';
import { db } from '@/lib/db/config';
import { groupStatuses } from '@/lib/db/schema/groupStatuses';
import { eq } from 'drizzle-orm';
import { getDiscordIdByLogin } from '@/lib/db/services/discordUsers';
import { sendDiscordDM } from '@/lib/services/discord';
import { getAllPromotions } from '@/lib/config/promotions';
import { getTrackByProjectName } from '@/lib/config/projects';
import { getReviewerForRoundRobin } from '@/lib/db/services/reviewers';
import { getNotifiedCount } from '@/lib/db/services/groupStatuses';

export async function POST(request: NextRequest) {
  const user = await stackServerApp.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  try {
    const { groupStatusId } = await request.json();
    if (!groupStatusId) {
      return NextResponse.json({ error: 'groupStatusId requis' }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(groupStatuses)
      .where(eq(groupStatuses.id, Number(groupStatusId)))
      .limit(1);

    const row = rows[0];
    if (!row) return NextResponse.json({ error: 'Groupe non trouvé' }, { status: 404 });
    if (!row.captainLogin) return NextResponse.json({ success: false, reason: 'no_captain' });

    const discordId = await getDiscordIdByLogin(row.captainLogin);
    if (!discordId) return NextResponse.json({ success: false, reason: 'no_discord' });

    // Resolve promo name
    const promotions = await getAllPromotions();
    const promo = promotions.find((p) => String(p.eventId) === row.promoId);
    const promoName = promo?.title ?? promo?.key ?? row.promoId;

    // Resolve reviewer for this project's track
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
    if (!sent) return NextResponse.json({ error: "Échec de l'envoi du DM Discord" }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resending DM:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
