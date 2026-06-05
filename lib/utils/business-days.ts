/**
 * Calculs de jours ouvrés (lundi→vendredi), avec prise en compte optionnelle
 * des vacances/jours fériés issus de la config (`lib/config/holidays.ts`).
 *
 * Utilisé par l'escalade des rapports d'audit (Feature 7) : un auditeur est
 * relancé si sa demande date de plus de N jours ouvrés sans réponse.
 */

import { getHolidaysConfig } from '@/lib/config/holidays';

/** True si la date tombe un samedi (6) ou un dimanche (0). */
function isWeekend(d: Date): boolean {
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Ensemble de jours fériés/vacances (clé `YYYY-MM-DD`, UTC) à partir de la
 * config holidays. Chaque intervalle {start,end} est expansé jour par jour
 * (bornes incluses). Renvoie un Set vide si la config est indisponible.
 */
async function getHolidayDateSet(): Promise<Set<string>> {
  const set = new Set<string>();
  try {
    const config = await getHolidaysConfig();
    for (const ranges of Object.values(config)) {
      for (const { start, end } of ranges) {
        const from = new Date(`${start}T00:00:00Z`);
        const to = new Date(`${end}T00:00:00Z`);
        if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) continue;
        for (let d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
          set.add(d.toISOString().slice(0, 10));
        }
      }
    }
  } catch {
    // Config indisponible → on retombe sur le simple week-end.
  }
  return set;
}

function isHoliday(d: Date, holidays: Set<string>): boolean {
  return holidays.has(d.toISOString().slice(0, 10));
}

/**
 * Renvoie la date obtenue en reculant de `n` jours ouvrés à partir de `date`
 * (week-ends et jours fériés/vacances ignorés). `n` doit être >= 0.
 */
export async function businessDaysBefore(date: Date, n: number): Promise<Date> {
  const holidays = await getHolidayDateSet();
  const cursor = new Date(date);
  let remaining = Math.max(0, Math.floor(n));
  while (remaining > 0) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (!isWeekend(cursor) && !isHoliday(cursor, holidays)) {
      remaining -= 1;
    }
  }
  return cursor;
}

/**
 * True si `date` est plus ancienne que `n` jours ouvrés par rapport à
 * maintenant (`now`). Autrement dit : `date <= now - n jours ouvrés`.
 */
export async function isOlderThanBusinessDays(
  date: Date,
  n: number,
  now: Date = new Date(),
): Promise<boolean> {
  const threshold = await businessDaysBefore(now, n);
  return date.getTime() <= threshold.getTime();
}
