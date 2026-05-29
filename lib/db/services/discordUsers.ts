import { db } from '../config';
import { discordUsers } from '../schema/discordUsers';
import { students } from '../schema/students';
import { eq } from 'drizzle-orm';
import { countableStudentsWhereNoJoin } from '../filters';

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

export interface StudentDiscordStatus {
  id: number;
  login: string;
  firstName: string;
  lastName: string;
  promoName: string | null;
  /** Discord mapping for this student's login, or null if not linked. */
  discordId: string | null;
  /** Mapping row id (discord_users.id), null when not linked. */
  mappingId: number | null;
}

/**
 * Returns every countable student (active, non-archived promo) with their
 * Discord link status. The link is resolved by matching `students.login`
 * against `discord_users.login`.
 *
 * @param promoKey optional — restrict to a single promo (students.promo_name).
 */
export async function getStudentsDiscordStatus(
  promoKey?: string,
): Promise<StudentDiscordStatus[]> {
  const where = await countableStudentsWhereNoJoin(
    promoKey ? eq(students.promoName, promoKey) : undefined,
  );

  const rows = await db
    .select({
      id: students.id,
      login: students.login,
      firstName: students.first_name,
      lastName: students.last_name,
      promoName: students.promoName,
      discordId: discordUsers.discordId,
      mappingId: discordUsers.id,
    })
    .from(students)
    .leftJoin(discordUsers, eq(students.login, discordUsers.login))
    .where(where);

  return rows;
}

/**
 * Rename the login key of a Discord mapping. Used when an admin fixes a typo
 * in the mapping's login (does NOT touch the students table). Returns false if
 * the new login already maps to a different row.
 */
export async function renameDiscordMappingLogin(
  oldLogin: string,
  newLogin: string,
): Promise<boolean> {
  if (oldLogin === newLogin) return true;
  const existing = await db
    .select({ id: discordUsers.id })
    .from(discordUsers)
    .where(eq(discordUsers.login, newLogin))
    .limit(1);
  if (existing.length > 0) return false;
  await db
    .update(discordUsers)
    .set({ login: newLogin, updatedAt: new Date() })
    .where(eq(discordUsers.login, oldLogin));
  return true;
}

/** Remove a student's Discord mapping (unlink). */
export async function deleteDiscordUser(login: string): Promise<void> {
  await db.delete(discordUsers).where(eq(discordUsers.login, login));
}

export interface OrphanDiscordMapping {
  id: number;
  login: string;
  discordId: string;
}

/**
 * Discord mappings whose `login` matches no student. These are usually typos —
 * notably an email saved where a handle was expected — so the link silently
 * fails. Surfaced on /students/discord so an admin can fix the login.
 */
export async function getOrphanDiscordMappings(): Promise<OrphanDiscordMapping[]> {
  const allStudentLogins = await db
    .select({ login: students.login })
    .from(students);
  const loginSet = new Set(allStudentLogins.map((r) => r.login));

  const mappings = await db
    .select({ id: discordUsers.id, login: discordUsers.login, discordId: discordUsers.discordId })
    .from(discordUsers);

  return mappings.filter((m) => !loginSet.has(m.login));
}
