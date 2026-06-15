/**
 * Socle Bot Framework (Microsoft Teams) — envoi proactif d'Adaptive Cards
 * interactives (Universal Actions : Action.Execute + refresh).
 *
 * Gating : tout est inactif tant que BOT_FRAMEWORK_APP_ID /
 * BOT_FRAMEWORK_APP_PASSWORD ne sont pas définis. Dans ce cas le recap continue
 * via le webhook Power Automate existant (`sendTeamsCard`).
 *
 * Auth sortante : OAuth client_credentials sur l'AppId/secret du bot
 * (audience https://api.botframework.com). Le token est mis en cache mémoire
 * jusqu'à un peu avant son expiration.
 */

import { getConversation } from '@/lib/db/services/teamsBot';

const APP_ID = process.env.BOT_FRAMEWORK_APP_ID;
const APP_PASSWORD = process.env.BOT_FRAMEWORK_APP_PASSWORD;
const TENANT_ID = process.env.BOT_FRAMEWORK_TENANT_ID;

const TOKEN_URL =
  'https://login.microsoftonline.com/botframework.com/oauth2/v2.0/token';
const BOT_SCOPE = 'https://api.botframework.com/.default';

export function isBotConfigured(): boolean {
  return Boolean(APP_ID && APP_PASSWORD);
}

export function getBotTenantId(): string | undefined {
  return TENANT_ID;
}

export function getBotAppId(): string | undefined {
  return APP_ID;
}

// ─── Token (cache mémoire) ───────────────────────────────────────────────────

let cachedToken: { value: string; expiresAt: number } | null = null;

/**
 * Récupère un token d'accès Bot Framework (client_credentials). Mis en cache
 * jusqu'à 60s avant expiration. Lance si le bot n'est pas configuré ou si le
 * service de token répond une erreur.
 */
export async function getBotToken(): Promise<string> {
  if (!APP_ID || !APP_PASSWORD) {
    throw new Error('Bot Framework non configuré (APP_ID/APP_PASSWORD manquants)');
  }

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.value;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: APP_ID,
    client_secret: APP_PASSWORD,
    scope: BOT_SCOPE,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`getBotToken: ${res.status} ${text}`);
  }

  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) {
    throw new Error('getBotToken: réponse sans access_token');
  }

  const expiresIn = typeof json.expires_in === 'number' ? json.expires_in : 3600;
  cachedToken = {
    value: json.access_token,
    expiresAt: now + expiresIn * 1000,
  };
  return cachedToken.value;
}

// ─── Envoi proactif ──────────────────────────────────────────────────────────

/**
 * Poste une Adaptive Card de façon proactive dans la conversation Teams
 * enregistrée (cf. `upsertConversation`, renseignée au `conversationUpdate`).
 * Retourne false si non configuré, pas de conversation, ou échec HTTP.
 */
export async function postCardProactively(card: object): Promise<boolean> {
  if (!isBotConfigured()) return false;

  const conv = await getConversation();
  if (!conv || !conv.serviceUrl || !conv.conversationId) {
    return false;
  }

  let token: string;
  try {
    token = await getBotToken();
  } catch (error) {
    console.error('postCardProactively: token error', error);
    return false;
  }

  const serviceUrl = conv.serviceUrl.replace(/\/+$/, '');
  const url = `${serviceUrl}/v3/conversations/${encodeURIComponent(conv.conversationId)}/activities`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        type: 'message',
        attachments: [
          {
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: card,
          },
        ],
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('postCardProactively: HTTP', res.status, text);
      return false;
    }
    return true;
  } catch (error) {
    console.error('postCardProactively: fetch error', error);
    return false;
  }
}
