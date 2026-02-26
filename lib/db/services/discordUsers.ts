import { db } from '../config';
import { discordUsers } from '../schema/discordUsers';
import { eq } from 'drizzle-orm';

export async function upsertDiscordUser(login: string, discordId: string): Promise<void> {
  await db
    .insert(discordUsers)
    .values({ login, discordId })
    .onConflictDoUpdate({
      target: discordUsers.login,
      set: { discordId, updatedAt: new Date() },
    });
}

export async function getDiscordIdByLogin(login: string): Promise<string | null> {
  const result = await db
    .select({ discordId: discordUsers.discordId })
    .from(discordUsers)
    .where(eq(discordUsers.login, login))
    .limit(1);
  return result[0]?.discordId ?? null;
}
