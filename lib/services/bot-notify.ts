/**
 * Émission des relances interactives via le BOT Discord (au lieu d'un DM texte
 * direct). Le bot envoie un embed en DM, avec éventuellement un bouton vert
 * « Marquer le CR comme réservé » et/ou un bouton « Répondre », puis ré-émet le
 * `context` dans ses callbacks.
 *
 * Voir le contrat : POST {BOT_NOTIFY_URL}/api/notify, header X-Api-Key.
 *
 * En cas d'échec (bot injoignable, timeout, secret invalide…), renvoie
 * `{ ok: false }` : l'appelant retombe alors sur `sendDiscordDM` (DM texte
 * simple) pour ne pas perdre la relance.
 */

import { makeLog } from '@/lib/log';

const log = makeLog('bot-notify');

const BOT_NOTIFY_URL = process.env.BOT_NOTIFY_URL;
const BOT_NOTIFY_API_KEY = process.env.BOT_NOTIFY_API_KEY;

/** Délai court : on retombe vite sur le fallback DM si le bot ne répond pas. */
const TIMEOUT_MS = 6_000;

export type BotNotifyType = 'cr_rdv' | 'grouping' | 'audit_report' | 'milestone';

/** Un "fact" (paire clé/valeur) affiché dans l'embed Discord. */
export interface BotNotifyFact {
  name: string;
  value: string;
}

/** Actions interactives ajoutées au message DM par le bot. */
export interface BotNotifyActions {
  /** Ajoute le bouton VERT « Marquer le CR comme réservé » (uniquement `cr_rdv`). */
  bookButton: boolean;
  /** Ajoute le bouton « Répondre » (modal statut + commentaire). */
  replyButton: boolean;
}

/**
 * Contexte opaque, ré-émis tel quel dans les callbacks du bot. `type` reflète
 * le type de relance ; `source_label` est le libellé humain (carte Teams).
 * Les autres champs dépendent du type de relance.
 */
export interface BotNotifyContext {
  type: BotNotifyType;
  source_label: string;
  groupId?: string;
  promoId?: string;
  projectName?: string;
  captainLogin?: string;
  auditorLogin?: string;
  login?: string;
  nextProjectName?: string;
}

export interface BotNotifyPayload {
  type: BotNotifyType;
  recipientDiscordId: string;
  title: string;
  body: string;
  facts?: BotNotifyFact[];
  url?: string;
  actions: BotNotifyActions;
  context: BotNotifyContext;
}

export function isBotNotifyConfigured(): boolean {
  return Boolean(BOT_NOTIFY_URL && BOT_NOTIFY_API_KEY);
}

/**
 * Déclenche une relance interactive via le bot.
 * Renvoie `{ ok: false }` en cas d'échec (non configuré, timeout, !ok, JSON
 * invalide…) pour permettre le fallback `sendDiscordDM`.
 */
export async function notifyViaBot(
  payload: BotNotifyPayload,
): Promise<{ ok: boolean; messageId?: string }> {
  if (!BOT_NOTIFY_URL || !BOT_NOTIFY_API_KEY) {
    return { ok: false };
  }

  // Mapping camelCase → snake_case conforme au contrat (§1).
  const wire = {
    type: payload.type,
    recipient_discord_id: payload.recipientDiscordId,
    title: payload.title,
    body: payload.body,
    ...(payload.facts ? { facts: payload.facts } : {}),
    ...(payload.url ? { url: payload.url } : {}),
    actions: {
      book_button: payload.actions.bookButton,
      reply_button: payload.actions.replyButton,
    },
    context: payload.context,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BOT_NOTIFY_URL}/api/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': BOT_NOTIFY_API_KEY,
      },
      body: JSON.stringify(wire),
      signal: controller.signal,
    });

    if (!res.ok) {
      log.error('notifyViaBot non-ok response', res.status);
      return { ok: false };
    }

    const data = (await res.json()) as { ok?: boolean; message_id?: string; error?: string };
    if (!data.ok) {
      log.error('notifyViaBot returned ok=false', data.error);
      return { ok: false };
    }
    return { ok: true, messageId: data.message_id };
  } catch (error) {
    log.error('notifyViaBot failed', error);
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}
