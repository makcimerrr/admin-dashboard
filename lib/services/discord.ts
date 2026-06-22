import { fetchWithRetry } from './http';
import { makeLog } from '@/lib/log';

const DISCORD_API = 'https://discord.com/api/v10';
const log = makeLog('discord');

export async function sendDiscordDM(discordUserId: string, content: string): Promise<boolean> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    log.error('DISCORD_BOT_TOKEN is not set');
    return false;
  }

  const headers = {
    Authorization: `Bot ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'DiscordBot (https://discord.com/api/v10, 1.0)',
  };

  try {
    const dmChannelRes = await fetchWithRetry(`${DISCORD_API}/users/@me/channels`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ recipient_id: discordUserId }),
      tag: 'discord',
      timeoutMs: 6_000,
      retries: 1,
    });

    if (!dmChannelRes.ok) {
      log.error('DM channel creation failed', dmChannelRes.status, await dmChannelRes.text());
      return false;
    }

    const dmChannel = await dmChannelRes.json();

    const messageRes = await fetchWithRetry(`${DISCORD_API}/channels/${dmChannel.id}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content }),
      tag: 'discord',
      timeoutMs: 6_000,
      retries: 1,
    });

    if (!messageRes.ok) {
      log.error('Message send failed', messageRes.status, await messageRes.text());
      return false;
    }

    return true;
  } catch (error) {
    log.error('DM error', error);
    return false;
  }
}

export interface GuildMember {
  /** Discord user id (snowflake). */
  id: string;
  /** @handle (user.username). */
  username: string;
  /** Display name global (user.global_name), peut être null. */
  globalName: string | null;
  /** Pseudo sur le serveur (member.nick), peut être null. */
  nick: string | null;
}

export type GuildMembersResult =
  | { ok: true; members: GuildMember[] }
  | { ok: false; error: string; guilds?: { id: string; name: string }[] };

/**
 * Liste les membres (non-bots) du serveur Discord via l'API REST avec le token
 * du bot. Requiert l'intent privilégié « Server Members Intent » côté portail.
 * Le serveur est pris depuis `DISCORD_GUILD_ID`, sinon auto-détecté si le bot
 * n'est que sur un seul serveur.
 */
export async function fetchGuildMembers(): Promise<GuildMembersResult> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return { ok: false, error: "DISCORD_BOT_TOKEN n'est pas défini." };

  const headers = {
    Authorization: `Bot ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'DiscordBot (https://discord.com/api/v10, 1.0)',
  };

  // 1) Résoudre le serveur.
  let guildId = process.env.DISCORD_GUILD_ID?.trim();
  if (!guildId) {
    try {
      const gres = await fetchWithRetry(`${DISCORD_API}/users/@me/guilds`, {
        method: 'GET', headers, tag: 'discord', timeoutMs: 8_000, retries: 1,
      });
      if (!gres.ok) return { ok: false, error: `Impossible de lister les serveurs du bot (${gres.status}).` };
      const guilds = (await gres.json()) as { id: string; name: string }[];
      if (!Array.isArray(guilds) || guilds.length === 0) {
        return { ok: false, error: "Le bot n'est sur aucun serveur." };
      }
      if (guilds.length > 1) {
        return {
          ok: false,
          error: 'Le bot est sur plusieurs serveurs : définissez DISCORD_GUILD_ID.',
          guilds: guilds.map((g) => ({ id: g.id, name: g.name })),
        };
      }
      guildId = guilds[0].id;
    } catch (e) {
      log.error('guild resolve error', e);
      return { ok: false, error: 'Erreur lors de la résolution du serveur Discord.' };
    }
  }

  // 2) Paginer les membres (1000 max par page, curseur `after`).
  const members: GuildMember[] = [];
  let after = '0';
  try {
    for (let page = 0; page < 50; page++) {
      const res = await fetchWithRetry(
        `${DISCORD_API}/guilds/${guildId}/members?limit=1000&after=${after}`,
        { method: 'GET', headers, tag: 'discord', timeoutMs: 12_000, retries: 1 },
      );
      if (res.status === 403) {
        return {
          ok: false,
          error: "Le bot n'a pas l'intent « Server Members Intent » (à activer dans le portail développeur Discord), ou n'a pas accès à ce serveur.",
        };
      }
      if (!res.ok) return { ok: false, error: `API Discord: ${res.status}.` };
      const batch = (await res.json()) as Array<{
        nick: string | null;
        user?: { id: string; username: string; global_name: string | null; bot?: boolean };
      }>;
      if (!Array.isArray(batch) || batch.length === 0) break;
      for (const m of batch) {
        const u = m.user;
        if (!u || u.bot) continue;
        members.push({
          id: String(u.id),
          username: u.username ?? '',
          globalName: u.global_name ?? null,
          nick: m.nick ?? null,
        });
      }
      if (batch.length < 1000) break;
      after = String(batch[batch.length - 1].user?.id ?? '');
      if (!after) break;
    }
  } catch (e) {
    log.error('members fetch error', e);
    return { ok: false, error: 'Erreur lors de la récupération des membres Discord.' };
  }

  return { ok: true, members };
}
