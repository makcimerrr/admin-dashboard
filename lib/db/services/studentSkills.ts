import { db } from '../config';
import {
  studentGiteaProfiles,
  studentSkills,
  type NewStudentGiteaProfile,
  type NewStudentSkill,
  type StudentGiteaProfile,
  type StudentSkill,
} from '../schema/studentSkills';
import { students } from '../schema/students';
import { eq } from 'drizzle-orm';
import { countableStudentsWhereNoJoin } from '../filters';

/** Upsert (1 ligne par login) du snapshot Gitea. */
export async function upsertGiteaProfile(data: NewStudentGiteaProfile): Promise<void> {
  await db
    .insert(studentGiteaProfiles)
    .values(data)
    .onConflictDoUpdate({
      target: studentGiteaProfiles.login,
      set: {
        totalContributions: data.totalContributions,
        activeDays: data.activeDays,
        contributions30d: data.contributions30d,
        contributions90d: data.contributions90d,
        currentStreakDays: data.currentStreakDays,
        longestStreakDays: data.longestStreakDays,
        lastActivityAt: data.lastActivityAt,
        engagementScore: data.engagementScore,
        affinityLabel: data.affinityLabel,
        reposCount: data.reposCount,
        languages: data.languages,
        raw: data.raw,
        fetchedAt: new Date(),
      },
    });
}

export async function getGiteaProfile(login: string): Promise<StudentGiteaProfile | null> {
  const rows = await db
    .select()
    .from(studentGiteaProfiles)
    .where(eq(studentGiteaProfiles.login, login))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSkillsByLogin(login: string): Promise<StudentSkill[]> {
  return db.select().from(studentSkills).where(eq(studentSkills.login, login));
}

/** Remplace toutes les skills d'un étudiant (utilisé par l'analyse Palier 2). */
export async function replaceStudentSkills(login: string, rows: NewStudentSkill[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(studentSkills).where(eq(studentSkills.login, login));
    if (rows.length > 0) await tx.insert(studentSkills).values(rows);
  });
}

export interface StudentSkillRow {
  id: number;
  login: string;
  firstName: string;
  lastName: string;
  promoName: string | null;
  profile: StudentGiteaProfile | null;
}

/**
 * Liste les étudiants countable (actifs, promo non archivée) avec leur snapshot
 * Gitea s'il existe. Optionnellement filtré par promo.
 */
export async function getStudentsWithGiteaProfiles(promoKey?: string): Promise<StudentSkillRow[]> {
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
      profile: studentGiteaProfiles,
    })
    .from(students)
    .leftJoin(studentGiteaProfiles, eq(students.login, studentGiteaProfiles.login))
    .where(where);

  return rows.map((r) => ({ ...r, profile: r.profile ?? null }));
}

/** Logins des étudiants countable — utilisé par le cron de scan. */
export async function getActiveStudentLogins(): Promise<string[]> {
  const where = await countableStudentsWhereNoJoin();
  const rows = await db.select({ login: students.login }).from(students).where(where);
  return rows.map((r) => r.login);
}
