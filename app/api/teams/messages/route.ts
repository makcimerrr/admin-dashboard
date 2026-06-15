import { NextRequest, NextResponse } from 'next/server';
import { verifyBotJwt } from '@/lib/services/teams-bot-auth';
import { isBotConfigured, getBotAppId } from '@/lib/services/teams-bot';
import { upsertConversation } from '@/lib/db/services/teamsBot';
import {
  markRdvConfirmed,
  unmarkRdvConfirmed,
  getRdvConfirmedMap,
} from '@/lib/db/services/groupStatuses';
import {
  buildRecapCardFromState,
  parseRecapAction,
  type RecapItem,
} from '@/lib/services/teams-recap';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Endpoint du bot Teams (Bot Framework). Reçoit les activités du Bot Connector :
 * - conversationUpdate → enregistre la conversation pour l'envoi proactif.
 * - invoke `adaptiveCard/action` (Universal Action) → applique les toggles de la
 *   checklist du recap et renvoie la carte reconstruite (invoke-response).
 *
 * Auth : JWT Bot Connector vérifié (signature RS256 via JWKS + aud/iss/exp).
 * Gating : si le bot n'est pas configuré (env absents) → 503, aucun effet.
 */

interface BotActivity {
  type?: string;
  name?: string;
  serviceUrl?: string;
  conversation?: { id?: string };
  channelData?: {
    tenant?: { id?: string };
    channel?: { id?: string };
  };
  value?: {
    action?: {
      verb?: string;
      data?: Record<string, unknown>;
    };
  };
}

function invokeResponse(card: object) {
  return NextResponse.json(
    {
      statusCode: 200,
      type: 'application/vnd.microsoft.card.adaptive',
      value: card,
    },
    { status: 200 },
  );
}

/** Reconstruit la carte à partir de l'état courant en base pour des items donnés. */
async function rebuildCard(
  items: RecapItem[],
  auditsLastWeek: number,
  weekLabel: string,
): Promise<object> {
  // Re-query l'état rdv_confirmed courant des groupes listés.
  const confirmedKeys = await getRdvConfirmedMap(items);
  return buildRecapCardFromState(items, auditsLastWeek, weekLabel, confirmedKeys);
}

export async function POST(request: NextRequest) {
  if (!isBotConfigured()) {
    return NextResponse.json(
      { error: 'Bot Framework non configuré' },
      { status: 503 },
    );
  }

  const appId = getBotAppId()!;
  const verified = await verifyBotJwt(request.headers.get('authorization'), appId);
  if (!verified) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  let activity: BotActivity;
  try {
    activity = (await request.json()) as BotActivity;
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 });
  }

  // ── conversationUpdate : bot ajouté à une équipe/canal ──────────────────────
  if (activity.type === 'conversationUpdate') {
    if (activity.serviceUrl && activity.conversation?.id) {
      try {
        await upsertConversation({
          serviceUrl: activity.serviceUrl,
          conversationId: activity.conversation.id,
          tenantId: activity.channelData?.tenant?.id ?? null,
          channelId: activity.channelData?.channel?.id ?? null,
        });
      } catch (error) {
        console.error('teams/messages conversationUpdate:', error);
      }
    }
    return new NextResponse(null, { status: 200 });
  }

  // ── invoke : Universal Action (Action.Execute / refresh) ────────────────────
  if (activity.type === 'invoke' && activity.name === 'adaptiveCard/action') {
    const action = activity.value?.action;
    const verb = action?.verb;
    const data = action?.data ?? {};
    const { items, checkedKeys, auditsLastWeek, weekLabel } = parseRecapAction(data);

    if (verb === 'recapUpdate') {
      // Applique chaque toggle : coché → markRdvConfirmed, décoché → unmark.
      for (const item of items) {
        const key = `${item.groupId}:${item.promoId}:${item.projectName.toLowerCase()}`;
        try {
          if (checkedKeys.has(key)) {
            await markRdvConfirmed(item.groupId, item.promoId, item.projectName);
          } else {
            await unmarkRdvConfirmed(item.groupId, item.promoId, item.projectName);
          }
        } catch (error) {
          console.error('teams/messages recapUpdate item:', error);
        }
      }
      const card = await rebuildCard(items, auditsLastWeek, weekLabel);
      return invokeResponse(card);
    }

    // recapRefresh (ou verbe inconnu) : carte reconstruite à l'état courant.
    const card = await rebuildCard(items, auditsLastWeek, weekLabel);
    return invokeResponse(card);
  }

  // Autres activités → 200 vide.
  return new NextResponse(null, { status: 200 });
}
