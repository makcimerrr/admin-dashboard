import { db } from '../config';
import { promoStatus } from '../schema/promoStatus';
import { eq } from 'drizzle-orm';

export async function getAllPromoStatus() {
  return db.select().from(promoStatus);
}

export async function getPromoStatusByKey(promoKey: string) {
  return db.select().from(promoStatus).where(eq(promoStatus.promoKey, promoKey));
}

export async function upsertPromoStatus(promoKey: string, status: string) {
  await db.insert(promoStatus).values({ promoKey, status }).onConflictDoUpdate({
    target: promoStatus.promoKey,
    set: { status },
  });
}

export async function deletePromoStatus(promoKey: string) {
  await db.delete(promoStatus).where(eq(promoStatus.promoKey, promoKey));
} 