import { db } from '../config';
import { coffeeDraws, coffeeDrawParticipants } from '../schema/coffeeDraws';
import type { CoffeeDraw, CoffeeDrawParticipant } from '../schema/coffeeDraws';
import { students } from '../schema/students';
import { getArchivedPromoNames } from '../filters';
import { and, eq, desc, sql, notInArray, asc, type SQL } from 'drizzle-orm';

export interface CoffeeDrawWithParticipants extends CoffeeDraw {
  participants: CoffeeDrawParticipant[];
}

interface EligibleStudent {
  id: number;
  login: string;
  firstName: string;
  lastName: string;
  promoName: string;
}

/**
 * Vivier éligible au tirage café : apprenants ACTIFS de toutes promos —
 * non archivés, non en perdition, NON alternants, et hors promos archivées.
 */
export async function getEligibleStudentsForCoffee(): Promise<EligibleStudent[]> {
  const filters: SQL[] = [
    sql`(${students.archived} IS NULL OR ${students.archived} = false)`,
    sql`(${students.isDropout} IS NULL OR ${students.isDropout} = false)`,
    sql`(${students.isAlternant} IS NULL OR ${students.isAlternant} = false)`,
  ];

  const archivedPromos = Array.from(await getArchivedPromoNames());
  if (archivedPromos.length > 0) {
    filters.push(notInArray(students.promoName, archivedPromos));
  }

  return db
    .select({
      id: students.id,
      login: students.login,
      firstName: students.first_name,
      lastName: students.last_name,
      promoName: students.promoName,
    })
    .from(students)
    .where(and(...filters));
}

/** Mélange Fisher-Yates (copie, ne mute pas l'entrée). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7); // 'YYYY-MM'
}

/**
 * Tire au sort 9–10 apprenants éligibles et persiste le tirage (+ snapshot des
 * participants). Le quota est aléatoire dans {9, 10}, borné par la taille du
 * vivier. Phase de test : aucun message Discord n'est envoyé.
 */
export async function createCoffeeDraw(): Promise<CoffeeDrawWithParticipants> {
  const pool = await getEligibleStudentsForCoffee();
  const targetQuota = Math.random() < 0.5 ? 9 : 10;
  const picked = shuffle(pool).slice(0, Math.min(targetQuota, pool.length));

  const [draw] = await db
    .insert(coffeeDraws)
    .values({ month: currentMonthKey(), quota: picked.length, status: 'draft' })
    .returning();

  if (picked.length > 0) {
    await db.insert(coffeeDrawParticipants).values(
      picked.map((s) => ({
        drawId: draw.id,
        studentId: s.id,
        login: s.login,
        firstName: s.firstName,
        lastName: s.lastName,
        promoName: s.promoName,
        status: 'drawn' as const,
      })),
    );
  }

  return { ...draw, participants: await getParticipants(draw.id) };
}

async function getParticipants(drawId: number): Promise<CoffeeDrawParticipant[]> {
  return db
    .select()
    .from(coffeeDrawParticipants)
    .where(eq(coffeeDrawParticipants.drawId, drawId))
    .orderBy(asc(coffeeDrawParticipants.promoName), asc(coffeeDrawParticipants.lastName));
}

/** Dernier tirage en date (avec ses participants), ou null si aucun. */
export async function getLatestCoffeeDraw(): Promise<CoffeeDrawWithParticipants | null> {
  const [draw] = await db
    .select()
    .from(coffeeDraws)
    .orderBy(desc(coffeeDraws.createdAt))
    .limit(1);

  if (!draw) return null;
  return { ...draw, participants: await getParticipants(draw.id) };
}
