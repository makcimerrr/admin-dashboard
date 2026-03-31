import { db } from '../config';
import { groupStatuses } from '../schema/groupStatuses';
import { eq, and, isNull, or, isNotNull, inArray, count, sql } from 'drizzle-orm';
import { discordUsers } from '../schema/discordUsers';
import { audits } from '../schema/audits';
import { getTrackByProjectName } from '@/lib/config/projects';
import { buildProjectGroups, fetchPromotionProgressions } from '@/lib/services/zone01';

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

export async function getNotifiedCount(): Promise<number> {
  const [result] = await db
    .select({ value: count() })
    .from(groupStatuses)
    .where(isNotNull(groupStatuses.notifiedAuditAt));
  return result?.value ?? 0;
}

export async function getOverdueGroups(): Promise<(typeof groupStatuses.$inferSelect)[]> {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86_400_000);
  return db
    .select()
    .from(groupStatuses)
    .where(
      and(
        eq(groupStatuses.status, 'audit'),
        isNotNull(groupStatuses.notifiedAuditAt),
        isNull(groupStatuses.slotDate),
        isNull(groupStatuses.reminderSentAt),
        sql`${groupStatuses.notifiedAuditAt} <= ${fourteenDaysAgo}`
      )
    );
}

export async function markReminderSent(id: number): Promise<void> {
  await db
    .update(groupStatuses)
    .set({ reminderSentAt: new Date() })
    .where(eq(groupStatuses.id, id));
}

export interface SuiviRow {
  id: number;
  groupId: string;
  promoId: string;
  projectName: string;
  status: string;
  captainLogin: string | null;
  notifiedAuditAt: Date | null;
  lastSeenAt: Date;
  slotDate: Date | null;
  slotBookedAt: Date | null;
  slotEventId: string | null;
  slotAttendeeEmail: string | null;
  hasDiscordId: boolean;
  track: string | null;
  auditId: number | null;
  auditCreatedAt: Date | null;
  auditorName: string | null;
}

export async function getAllForSuivi(): Promise<SuiviRow[]> {
  // Fetch rows: status='audit' OR (status='finished' AND notifiedAuditAt IS NOT NULL)
  const rows = await db
    .select()
    .from(groupStatuses)
    .where(
      or(
        eq(groupStatuses.status, 'audit'),
        and(eq(groupStatuses.status, 'finished'), isNotNull(groupStatuses.notifiedAuditAt))
      )
    );

  if (rows.length === 0) return [];

  // Batch resolve tracks from project names (unique project names only)
  const uniqueProjects = [...new Set(rows.map((r) => r.projectName))];
  const trackEntries = await Promise.all(
    uniqueProjects.map(async (name) => [name, await getTrackByProjectName(name)] as const)
  );
  const trackByProject = new Map(trackEntries);

  const groupIds = rows.map((r) => r.groupId);
  const promoIds = [...new Set(rows.map((r) => r.promoId))];
  const captainLogins = rows.map((r) => r.captainLogin).filter(Boolean) as string[];

  // Batch fetch discord users
  const discordRows =
    captainLogins.length > 0
      ? await db
          .select({ login: discordUsers.login })
          .from(discordUsers)
          .where(inArray(discordUsers.login, captainLogins))
      : [];
  const discordSet = new Set(discordRows.map((d) => d.login));

  // Batch fetch audits
  const auditRows =
    groupIds.length > 0
      ? await db
          .select({
            id: audits.id,
            groupId: audits.groupId,
            promoId: audits.promoId,
            projectName: audits.projectName,
            createdAt: audits.createdAt,
            auditorName: audits.auditorName,
          })
          .from(audits)
          .where(
            and(
              inArray(audits.groupId, groupIds),
              inArray(audits.promoId, promoIds)
            )
          )
      : [];

  // Build audit lookup: groupId:promoId:projectName -> audit
  const auditMap = new Map<string, (typeof auditRows)[0]>();
  for (const a of auditRows) {
    auditMap.set(`${a.groupId}:${a.promoId}:${a.projectName}`, a);
  }

  return rows.map((r) => {
    const audit = auditMap.get(`${r.groupId}:${r.promoId}:${r.projectName}`);
    return {
      id: r.id,
      groupId: r.groupId,
      promoId: r.promoId,
      projectName: r.projectName,
      status: r.status,
      captainLogin: r.captainLogin,
      notifiedAuditAt: r.notifiedAuditAt,
      lastSeenAt: r.lastSeenAt,
      slotDate: r.slotDate,
      slotBookedAt: r.slotBookedAt,
      slotEventId: r.slotEventId,
      slotAttendeeEmail: r.slotAttendeeEmail,
      hasDiscordId: r.captainLogin ? discordSet.has(r.captainLogin) : false,
      track: trackByProject.get(r.projectName) ?? null,
      auditId: audit?.id ?? null,
      auditCreatedAt: audit?.createdAt ?? null,
      auditorName: audit?.auditorName ?? null,
    };
  });
}

export async function updateSlot(
  id: number,
  slotDate: Date,
  slotEventId: string,
  slotAttendeeEmail: string | null
): Promise<void> {
  await db
    .update(groupStatuses)
    .set({ slotDate, slotEventId, slotBookedAt: new Date(), slotAttendeeEmail })
    .where(eq(groupStatuses.id, id));
}

export async function unlinkSlot(id: number): Promise<void> {
  await db
    .update(groupStatuses)
    .set({ slotDate: null, slotEventId: null, slotBookedAt: null, slotAttendeeEmail: null })
    .where(eq(groupStatuses.id, id));
}

export async function deleteGroupStatus(id: number): Promise<void> {
  await db.delete(groupStatuses).where(eq(groupStatuses.id, id));
}

export async function archiveGroupStatus(id: number): Promise<void> {
  await db.update(groupStatuses).set({ status: 'archived' }).where(eq(groupStatuses.id, id));
}

export async function cleanOrphanGroupStatuses(): Promise<number> {
  // Récupérer toutes les lignes
  const rows = await db.select().from(groupStatuses);
  let deletedCount = 0;
  for (const row of rows) {
    // Vérifier si le groupe existe encore
    const progressions = await fetchPromotionProgressions(row.promoId);
    const groups = buildProjectGroups(progressions, row.projectName);
    const exists = groups.some((g) => g.groupId === row.groupId);
    if (!exists) {
      await db.delete(groupStatuses).where(eq(groupStatuses.id, row.id));
      deletedCount++;
    }
  }
  return deletedCount;
}
