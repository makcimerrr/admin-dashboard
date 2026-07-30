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
  isAlternant: boolean;
}

/**
 * Vivier éligible au tirage café : apprenants ACTIFS de toutes promos —
 * non archivés, non en perdition, hors promos archivées. Les alternants sont
 * INCLUS (repérés ensuite par un tag). `exclude` retire des studentId précis
 * (ex. ceux déjà présents dans le tirage lors d'un re-tirage individuel).
 */
export async function getEligibleStudentsForCoffee(
  exclude: number[] = [],
): Promise<EligibleStudent[]> {
  const filters: SQL[] = [
    sql`(${students.archived} IS NULL OR ${students.archived} = false)`,
    sql`(${students.isDropout} IS NULL OR ${students.isDropout} = false)`,
  ];

  const archivedPromos = Array.from(await getArchivedPromoNames());
  if (archivedPromos.length > 0) {
    filters.push(notInArray(students.promoName, archivedPromos));
  }
  if (exclude.length > 0) {
    filters.push(notInArray(students.id, exclude));
  }

  return db
    .select({
      id: students.id,
      login: students.login,
      firstName: students.first_name,
      lastName: students.last_name,
      promoName: students.promoName,
      isAlternant: sql<boolean>`COALESCE(${students.isAlternant}, false)`,
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
        isAlternant: s.isAlternant,
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

export type RedrawResult =
  | { ok: true; draw: CoffeeDrawWithParticipants }
  | { ok: false; reason: 'not_found' | 'pool_exhausted' };

/**
 * Re-tire UN seul participant : le remplace par un apprenant éligible tiré au
 * sort, en excluant tous ceux déjà présents dans le même tirage (pas de
 * doublon). Met à jour la ligne en place (l'id du participant est conservé).
 */
export async function redrawParticipant(participantId: number): Promise<RedrawResult> {
  const [participant] = await db
    .select()
    .from(coffeeDrawParticipants)
    .where(eq(coffeeDrawParticipants.id, participantId))
    .limit(1);

  if (!participant) return { ok: false, reason: 'not_found' };

  // Exclure tous les studentId déjà présents dans ce tirage (dont le sortant).
  const current = await db
    .select({ studentId: coffeeDrawParticipants.studentId })
    .from(coffeeDrawParticipants)
    .where(eq(coffeeDrawParticipants.drawId, participant.drawId));
  const excludeIds = current.map((r) => r.studentId);

  const pool = await getEligibleStudentsForCoffee(excludeIds);
  if (pool.length === 0) return { ok: false, reason: 'pool_exhausted' };

  const next = shuffle(pool)[0];
  await db
    .update(coffeeDrawParticipants)
    .set({
      studentId: next.id,
      login: next.login,
      firstName: next.firstName,
      lastName: next.lastName,
      promoName: next.promoName,
      isAlternant: next.isAlternant,
      status: 'drawn',
    })
    .where(eq(coffeeDrawParticipants.id, participantId));

  const draw = await getCoffeeDrawById(participant.drawId);
  return draw ? { ok: true, draw } : { ok: false, reason: 'not_found' };
}

async function getCoffeeDrawById(drawId: number): Promise<CoffeeDrawWithParticipants | null> {
  const [draw] = await db
    .select()
    .from(coffeeDraws)
    .where(eq(coffeeDraws.id, drawId))
    .limit(1);
  if (!draw) return null;
  return { ...draw, participants: await getParticipants(drawId) };
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
