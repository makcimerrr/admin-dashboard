/**
 * Utilitaire pour accéder à la configuration des vacances depuis la DB.
 * Cache 1h, invalidé via `revalidateTag(CACHE_TAGS.holidays)`.
 */

import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, CACHE_TTL } from '../cache';
import { getAllHolidays } from '../db/services/holidays';

export type HolidaysConfig = Record<string, { start: string; end: string }[]>;

export function dbHolidaysToConfig(
  rows: { id: number; label: string; start: string; end: string }[]
): HolidaysConfig {
  const result: HolidaysConfig = {};
  for (const row of rows) {
    if (!result[row.label]) result[row.label] = [];
    result[row.label].push({ start: row.start, end: row.end });
  }
  return result;
}

export const getHolidaysConfig = unstable_cache(
  async (): Promise<HolidaysConfig> => {
    const rows = await getAllHolidays();
    return dbHolidaysToConfig(rows);
  },
  ['holidays-config'],
  { tags: [CACHE_TAGS.holidays], revalidate: CACHE_TTL.long },
);
