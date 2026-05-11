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
