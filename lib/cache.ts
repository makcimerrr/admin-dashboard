import { revalidateTag } from 'next/cache';

/**
 * Cache tags — one stable identifier per data domain. Routes that mutate data
 * call `invalidate(CACHE_TAGS.xxx)` so cached reads pick up the change on
 * the next request.
 */
export const CACHE_TAGS = {
  promotions: 'promotions',
  projects: 'projects',
  holidays: 'holidays',
  widgetsOverview: 'widgets-overview',
  codeReviewsStats: 'code-reviews-stats',
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

/**
 * Default revalidation windows in seconds. Tune per data domain:
 *  - config rarely changes  → 1h
 *  - aggregated stats       → 5-10min (fresh enough for dashboards, cheap)
 *  - per-student data       → not cached (handled by SWR-style client fetches)
 */
export const CACHE_TTL = {
  long: 3600, // 1h
  medium: 600, // 10min
  short: 60, // 1min
} as const;

/**
 * Bust one or more cache tags. Use inside a POST/PATCH/DELETE handler
 * after a mutation:
 *
 *     await addProject(...);
 *     invalidate(CACHE_TAGS.projects);
 */
export function invalidate(...tags: CacheTag[]) {
  // Next 16 : revalidateTag exige un profil cacheLife en 2e argument.
  // `max` = invalidation classique (le prochain accès recalcule). updateTag()
  // n'est pas utilisable ici (réservé aux Server Actions ; on est en Route Handler).
  for (const t of tags) revalidateTag(t, 'max');
}
