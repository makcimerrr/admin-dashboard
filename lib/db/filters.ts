/**
 * Shared SQL conditions used to filter "countable" students across every
 * stats / analytics / widget route.
 *
 * A student is countable when:
 *   - they are NOT marked as dropout (`students.isDropout = false`)
 *   - they belong to a promotion that is NOT archived
 *     (`promotions.isArchived = false OR NULL`)
 *
 * The archived check requires a join against `promotions` on
 * `students.promoName = promotions.name`. Pass `withPromoJoin: true` in
 * helpers below to opt into the join + filter; otherwise only the
 * dropout filter is applied.
 */
import { sql, and, eq, or, isNull, type SQL } from 'drizzle-orm';
import { students } from './schema/students';
import { promotions } from './schema/promotions';
import { db } from './config';

/** Cached set of archived promo names, refreshed every 5 minutes. */
let archivedNamesCache: { names: Set<string>; expiresAt: number } | null = null;
const TTL_MS = 5 * 60 * 1000;

export async function getArchivedPromoNames(): Promise<Set<string>> {
  const now = Date.now();
  if (archivedNamesCache && archivedNamesCache.expiresAt > now) {
    return archivedNamesCache.names;
  }
  const rows = await db
    .select({ name: promotions.name })
    .from(promotions)
    .where(eq(promotions.isArchived, true));
  const names = new Set(rows.map((r) => r.name));
  archivedNamesCache = { names, expiresAt: now + TTL_MS };
  return names;
}

/** Manually invalidate the cache (call after archive/unarchive mutations). */
export function invalidateArchivedPromoCache(): void {
  archivedNamesCache = null;
}

/**
 * SQL condition: student is active (not dropout).
 * Always use it on any aggregation that touches `students`.
 */
export const notDropoutCondition = eq(students.isDropout, false);

/**
 * SQL condition: student's promo is NOT archived.
 * Requires the query to JOIN with `promotions` ON
 * `students.promoName = promotions.name`. Returns `true` when no promo
 * row exists (e.g. legacy data) to avoid losing students whose promo
 * is not yet in the promotions table.
 */
export const promoNotArchivedCondition: SQL = or(
  eq(promotions.isArchived, false),
  isNull(promotions.isArchived),
) as SQL;

/**
 * Combined: countable students. Use as
 *   .where(countableStudentsWhere())
 * after a `.innerJoin(promotions, eq(students.promoName, promotions.name))`.
 */
export function countableStudentsWhere(...extra: (SQL | undefined)[]): SQL {
  const filters: (SQL | undefined)[] = [notDropoutCondition, promoNotArchivedCondition, ...extra];
  return and(...filters.filter(Boolean)) as SQL;
}

/**
 * Variant that uses a `NOT IN (archived names)` subquery instead of a join.
 * Useful when the query already joins multiple tables and adding a JOIN to
 * promotions would be awkward. Equivalent semantically.
 */
export async function countableStudentsWhereNoJoin(...extra: (SQL | undefined)[]): Promise<SQL> {
  const archived = await getArchivedPromoNames();
  const archivedArr = [...archived];
  const archivedFilter: SQL | undefined = archivedArr.length > 0
    ? sql`${students.promoName} NOT IN (${sql.join(archivedArr.map((n) => sql`${n}`), sql`, `)})`
    : undefined;
  const filters: (SQL | undefined)[] = [notDropoutCondition, archivedFilter, ...extra];
  return and(...filters.filter(Boolean)) as SQL;
}
