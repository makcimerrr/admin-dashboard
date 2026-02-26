/**
 * Utilitaire pour accéder à la configuration des vacances depuis la DB
 */

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

export async function getHolidaysConfig(): Promise<HolidaysConfig> {
  const rows = await getAllHolidays();
  return dbHolidaysToConfig(rows);
}
