import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/stack-server';
import { db } from '@/lib/db/config';
import { groupStatuses } from '@/lib/db/schema/groupStatuses';
import { eq } from 'drizzle-orm';
import { getDiscordIdByLogin } from '@/lib/db/services/discordUsers';
import { sendDiscordDM } from '@/lib/services/discord';
import { markAuditNotified } from '@/lib/db/services/groupStatuses';
import { getAllPromotions } from '@/lib/config/promotions';

function buildReminderMessage(captainLogin: string, projectName: string, promoName: string): string {
  return [
    `Hey ${captainLogin} ! 👋`,
    ``,
    `Rappel : ton groupe est en attente de code-review pour **${projectName}** (${promoName}).`,
    ``,
    `Réserve ton créneau ici :`,
    `📅 https://calendar.app.google/2MoLxboyXGECFUjT6`,
    ``,
    `N'oublie pas de prévenir tes coéquipiers. Bonne chance ! 💪`,
  ].join('\n');
}

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
    if (!row) {
      return NextResponse.json({ error: 'Groupe non trouvé' }, { status: 404 });
    }

    if (!row.captainLogin) {
      return NextResponse.json({ success: false, reason: 'no_captain' });
    }

    const discordId = await getDiscordIdByLogin(row.captainLogin);
    if (!discordId) {
      return NextResponse.json({ success: false, reason: 'no_discord' });
    }

    const promotions = await getAllPromotions();
    const promo = promotions.find((p) => String(p.eventId) === row.promoId);
    const promoName = promo?.title ?? promo?.key ?? row.promoId;

    const message = buildReminderMessage(row.captainLogin, row.projectName, promoName);
    const sent = await sendDiscordDM(discordId, message);

    if (!sent) {
      return NextResponse.json({ error: 'Échec de l\'envoi du DM Discord' }, { status: 500 });
    }

    await markAuditNotified(row.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resending DM:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
