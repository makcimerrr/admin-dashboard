import { db } from '../config';
import { holidays } from '../schema/holidays';
import { eq } from 'drizzle-orm';

export async function getAllHolidays() {
  return db.select().from(holidays);
}

export async function getHolidaysByLabel(label: string) {
  return db.select().from(holidays).where(eq(holidays.label, label));
}

export async function addHoliday(label: string, start: string, end: string) {
  await db.insert(holidays).values({ label, start, end });
}

export async function deleteHoliday(id: number) {
  await db.delete(holidays).where(eq(holidays.id, id));
}

export async function deleteHolidayById(id: number) {
  await db.delete(holidays).where(eq(holidays.id, id));
}

export async function updateHoliday(
  id: number,
  data: { label?: string; start?: string; end?: string }
) {
  const updates: { label?: string; start?: string; end?: string } = {};
  if (data.label !== undefined) updates.label = data.label;
  if (data.start !== undefined) updates.start = data.start;
  if (data.end !== undefined) updates.end = data.end;

  if (Object.keys(updates).length === 0) return;

  await db.update(holidays).set(updates).where(eq(holidays.id, id));
}
