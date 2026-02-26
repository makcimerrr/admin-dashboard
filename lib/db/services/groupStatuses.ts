import { db } from '../config';
import { groupStatuses } from '../schema/groupStatuses';
import { eq, and, isNull } from 'drizzle-orm';

export async function upsertGroupStatus(
  groupId: string,
  promoId: string,
  projectName: string,
  status: string,
  captainLogin?: string
): Promise<void> {
  await db
    .insert(groupStatuses)
    .values({
      groupId,
      promoId,
      projectName,
      status,
      captainLogin: captainLogin ?? null,
      lastSeenAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [groupStatuses.groupId, groupStatuses.promoId, groupStatuses.projectName],
      set: {
        status,
        captainLogin: captainLogin ?? null,
        lastSeenAt: new Date(),
      },
    });
}

export async function getPendingAuditNotifications(): Promise<
  (typeof groupStatuses.$inferSelect)[]
> {
  return db
    .select()
    .from(groupStatuses)
    .where(and(eq(groupStatuses.status, 'audit'), isNull(groupStatuses.notifiedAuditAt)));
}

export async function markAuditNotified(id: number): Promise<void> {
  await db
    .update(groupStatuses)
    .set({ notifiedAuditAt: new Date() })
    .where(eq(groupStatuses.id, id));
}
