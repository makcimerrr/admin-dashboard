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