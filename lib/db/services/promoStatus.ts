import { db } from '../config';
import { promoStatus } from '../schema/promoStatus';
import { eq } from 'drizzle-orm';

export async function getAllPromoStatus() {
  return db.select().from(promoStatus);
}

export async function getPromoStatusByKey(promoKey: string) {
  return db.select().from(promoStatus).where(eq(promoStatus.promoKey, promoKey));
}

export type PromoStatusUpsert = {
  promoKey: string;
  status: string;
  promotionName: string;
  currentProject?: string | null;
  progress?: number;
  agenda?: string[] | null;
  startDate?: string | null;
  endDate?: string | null;
  lastUpdated?: Date | string;
};

export async function upsertPromoStatus(data: PromoStatusUpsert) {
  // Remove undefined fields so drizzle doesn't try to insert them as undefined
  const filteredData: Partial<PromoStatusUpsert> = {};
  for (const key of Object.keys(data) as Array<keyof PromoStatusUpsert>) {
    if (data[key] !== undefined && data[key] !== null) filteredData[key] = data[key] as any;
  }
  await db.insert(promoStatus).values(filteredData as any).onConflictDoUpdate({
    target: promoStatus.promoKey,
    set: {
      ...filteredData,
      lastUpdated: filteredData.lastUpdated instanceof Date
        ? filteredData.lastUpdated
        : filteredData.lastUpdated
          ? new Date(filteredData.lastUpdated)
          : undefined,
    },
  });
}

export async function deletePromoStatus(promoKey: string) {
  await db.delete(promoStatus).where(eq(promoStatus.promoKey, promoKey));
}

export async function getPromoStatusForDisplay() {
  return db.select().from(promoStatus).orderBy(promoStatus.promoKey);
}
