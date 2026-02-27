const DISCORD_API = 'https://discord.com/api/v10';

export async function sendDiscordDM(discordUserId: string, content: string): Promise<boolean> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.error('DISCORD_BOT_TOKEN is not set');
    return false;
  }

  const headers = {
    Authorization: `Bot ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'DiscordBot (https://discord.com/api/v10, 1.0)',
  };

  try {
    // 1. Create DM channel
    const dmChannelRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ recipient_id: discordUserId }),
    });

    if (!dmChannelRes.ok) {
      console.error(`Discord DM channel creation failed: ${dmChannelRes.status} ${await dmChannelRes.text()}`);
      return false;
    }

    const dmChannel = await dmChannelRes.json();

    // 2. Send message
    const messageRes = await fetch(`${DISCORD_API}/channels/${dmChannel.id}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content }),
    });

    if (!messageRes.ok) {
      console.error(`Discord message send failed: ${messageRes.status} ${await messageRes.text()}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Discord DM error:', error);
    return false;
  }
}
