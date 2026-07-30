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
 * non archivés, non en perdition, hors promos archivées. `includeAlternants`
 * (défaut true) contrôle l'inclusion des alternants. `exclude` retire des
 * studentId précis (ex. ceux déjà présents lors d'un re-tirage individuel).
 */
export async function getEligibleStudentsForCoffee(
  { exclude = [], includeAlternants = true }: { exclude?: number[]; includeAlternants?: boolean } = {},
): Promise<EligibleStudent[]> {
  const filters: SQL[] = [
    sql`(${students.archived} IS NULL OR ${students.archived} = false)`,
    sql`(${students.isDropout} IS NULL OR ${students.isDropout} = false)`,
  ];

  if (!includeAlternants) {
    filters.push(sql`(${students.isAlternant} IS NULL OR ${students.isAlternant} = false)`);
  }

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

/** Les `n` derniers mois (clés 'YYYY-MM', mois courant inclus). */
function recentMonthKeys(n: number): Set<string> {
  const set = new Set<string>();
  const now = new Date();
  for (let i = 0; i < Math.max(0, n); i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    set.add(d.toISOString().slice(0, 7));
  }
  return set;
}

/** Dernier mois de tirage par apprenant (studentId → 'YYYY-MM'). */
async function lastDrawnMonthByStudent(): Promise<Map<number, string>> {
  const rows = await db
    .select({
      studentId: coffeeDrawParticipants.studentId,
      lastMonth: sql<string>`max(${coffeeDraws.month})`,
    })
    .from(coffeeDrawParticipants)
    .innerJoin(coffeeDraws, eq(coffeeDraws.id, coffeeDrawParticipants.drawId))
    .groupBy(coffeeDrawParticipants.studentId);
  return new Map(rows.map((r) => [r.studentId, r.lastMonth]));
}

/**
 * Sélection anti-répétition : privilégie les JAMAIS-tirés, puis les tirés hors
 * cooldown (les moins récents d'abord), et n'entame les « en cooldown » (tirés
 * dans les `cooldownMonths` derniers mois) qu'en dernier recours si le vivier
 * est trop petit pour atteindre `count`.
 */
async function pickWithAntiRepeat({
  count,
  includeAlternants,
  excludeIds = [],
  cooldownMonths,
}: {
  count: number;
  includeAlternants: boolean;
  excludeIds?: number[];
  cooldownMonths: number;
}): Promise<EligibleStudent[]> {
  const pool = await getEligibleStudentsForCoffee({ exclude: excludeIds, includeAlternants });
  const lastMonth = await lastDrawnMonthByStudent();
  const recent = recentMonthKeys(cooldownMonths);

  const never: EligibleStudent[] = [];
  const stale: { s: EligibleStudent; m: string }[] = [];
  const cooling: { s: EligibleStudent; m: string }[] = [];
  for (const s of pool) {
    const m = lastMonth.get(s.id);
    if (!m) never.push(s);
    else if (recent.has(m)) cooling.push({ s, m });
    else stale.push({ s, m });
  }

  const picked: EligibleStudent[] = [];
  const take = (arr: EligibleStudent[]) => {
    for (const s of arr) {
      if (picked.length >= count) break;
      picked.push(s);
    }
  };
  take(shuffle(never));
  take(shuffle(stale.map((x) => x.s)));
  // Relâchement : en cooldown, les moins récents d'abord.
  take(cooling.sort((a, b) => a.m.localeCompare(b.m)).map((x) => x.s));
  return picked.slice(0, count);
}

/**
 * Tire au sort des apprenants éligibles (quota configurable, défaut aléatoire
 * 9–10) avec anti-répétition, et persiste le tirage (+ snapshot des
 * participants). Phase de test : aucun message Discord n'est envoyé.
 */
export async function createCoffeeDraw(
  {
    includeAlternants = true,
    quota,
    cooldownMonths = 3,
  }: { includeAlternants?: boolean; quota?: number; cooldownMonths?: number } = {},
): Promise<CoffeeDrawWithParticipants> {
  const targetQuota = quota && quota > 0 ? quota : Math.random() < 0.5 ? 9 : 10;
  const picked = await pickWithAntiRepeat({
    count: targetQuota,
    includeAlternants,
    cooldownMonths,
  });

  const [draw] = await db
    .insert(coffeeDraws)
    .values({
      month: currentMonthKey(),
      quota: picked.length,
      includeAlternants,
      cooldownMonths,
      status: 'draft',
    })
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

  // Réutilise les réglages du tirage (alternants + cooldown anti-répétition).
  const [draw0] = await db
    .select({
      includeAlternants: coffeeDraws.includeAlternants,
      cooldownMonths: coffeeDraws.cooldownMonths,
    })
    .from(coffeeDraws)
    .where(eq(coffeeDraws.id, participant.drawId))
    .limit(1);

  const picked = await pickWithAntiRepeat({
    count: 1,
    includeAlternants: draw0?.includeAlternants ?? true,
    excludeIds,
    cooldownMonths: draw0?.cooldownMonths ?? 3,
  });
  if (picked.length === 0) return { ok: false, reason: 'pool_exhausted' };

  const next = picked[0];
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
