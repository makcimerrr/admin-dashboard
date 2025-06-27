import { db } from '../config';
import { promoConfig } from '../schema/promoConfig';
import { eq } from 'drizzle-orm';

export async function getAllPromoConfig() {
  return db.select().from(promoConfig);
}

export async function getPromoConfigByKey(key: string) {
  return db.select().from(promoConfig).where(eq(promoConfig.key, key));
}

export async function upsertPromoConfig(data: any) {
  await db.insert(promoConfig).values(data).onConflictDoUpdate({
    target: promoConfig.key,
    set: data,
  });
}

export async function deletePromoConfig(key: string) {
  await db.delete(promoConfig).where(eq(promoConfig.key, key));
} 