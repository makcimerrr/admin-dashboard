import { db } from '../config';
import { groupStatuses } from '../schema/groupStatuses';
import { eq, and, isNull, or, isNotNull, inArray, count, sql } from 'drizzle-orm';
import { discordUsers } from '../schema/discordUsers';
import { audits } from '../schema/audits';
import { projects } from '../schema/projects';
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
      setupAt: (status === 'setup' || status === 'in_progress') ? new Date() : null,
      lastSeenAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [groupStatuses.groupId, groupStatuses.promoId, groupStatuses.projectName],
      set: {
        // Preserve a manually-archived row: if the existing status is
        // 'archived', keep it. Otherwise overwrite with the freshly
        // observed Zone01 status. Without this guard the daily cron
        // would resurrect archived rows in /code-reviews/suivi.
        status: sql`CASE WHEN ${groupStatuses.status} = 'archived' THEN 'archived' ELSE ${status} END`,
        captainLogin: captainLogin ?? null,
        setupAt: sql`COALESCE(${groupStatuses.setupAt}, CASE WHEN ${status} IN ('setup','in_progress') THEN now() ELSE NULL END)`,
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

export async function markAuditNotified(id: number, reviewerName?: string): Promise<void> {
  await db
    .update(groupStatuses)
    .set({
      notifiedAuditAt: new Date(),
      ...(reviewerName ? { notifiedReviewerName: reviewerName } : {}),
    })
    .where(eq(groupStatuses.id, id));
}

export interface MilestoneCheckRow {
  id: number;
  groupId: string;
  promoId: string;
  projectName: string;
  captainLogin: string | null;
  setupAt: Date | null;
  notified30At: Date | null;
  notified50At: Date | null;
  notified70At: Date | null;
  projectTimeWeek: number | null;
  optional: boolean | null;
  discordId: string | null;
}

export async function getGroupsForMilestoneCheck(): Promise<MilestoneCheckRow[]> {
  return db
    .select({
      id: groupStatuses.id,
      groupId: groupStatuses.groupId,
      promoId: groupStatuses.promoId,
      projectName: groupStatuses.projectName,
      captainLogin: groupStatuses.captainLogin,
      setupAt: groupStatuses.setupAt,
      notified30At: groupStatuses.notified30At,
      notified50At: groupStatuses.notified50At,
      notified70At: groupStatuses.notified70At,
      projectTimeWeek: projects.projectTimeWeek,
      optional: projects.optional,
      discordId: discordUsers.discordId,
    })
    .from(groupStatuses)
    .leftJoin(projects, sql`lower(${projects.name}) = lower(${groupStatuses.projectName})`)
    .leftJoin(discordUsers, eq(discordUsers.login, groupStatuses.captainLogin))
    .where(
      and(
        inArray(groupStatuses.status, ['setup', 'in_progress']),
        isNotNull(groupStatuses.setupAt),
        isNotNull(groupStatuses.captainLogin)
      )
    );
}

export async function markMilestoneNotified(id: number, milestone: 30 | 50 | 70): Promise<void> {
  const field =
    milestone === 30 ? 'notified30At' : milestone === 50 ? 'notified50At' : 'notified70At';
  await db
    .update(groupStatuses)
    .set({ [field]: new Date() })
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
        // Exclure ceux qui ont confirmé via le bouton vert « RDV pris »
        // (rdv_confirmed_at) : ils ont déjà réservé, pas de rappel.
        isNull(groupStatuses.rdvConfirmedAt),
        isNull(groupStatuses.reminderSentAt),
        sql`${groupStatuses.notifiedAuditAt} <= ${fourteenDaysAgo.toISOString()}`
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
  rdvConfirmedAt: Date | null;
  hasDiscordId: boolean;
  track: string | null;
  auditId: number | null;
  auditCreatedAt: Date | null;
  auditorName: string | null;
  manualReminderAt: Date | null;
  notifiedReviewerName: string | null;
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

  // Build audit lookup: groupId:promoId:projectName (lowercase) -> audit
  const auditMap = new Map<string, (typeof auditRows)[0]>();
  for (const a of auditRows) {
    auditMap.set(`${a.groupId}:${a.promoId}:${a.projectName.toLowerCase()}`, a);
  }

  return rows.map((r) => {
    const audit = auditMap.get(`${r.groupId}:${r.promoId}:${r.projectName.toLowerCase()}`);
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
      rdvConfirmedAt: r.rdvConfirmedAt,
      hasDiscordId: r.captainLogin ? discordSet.has(r.captainLogin) : false,
      track: trackByProject.get(r.projectName) ?? null,
      auditId: audit?.id ?? null,
      auditCreatedAt: audit?.createdAt ?? null,
      auditorName: audit?.auditorName ?? null,
      manualReminderAt: r.manualReminderAt,
      notifiedReviewerName: r.notifiedReviewerName ?? null,
    };
  });
}

/**
 * Marque le RDV de code review comme confirmé (réaction ✅ côté bot).
 * Set `rdv_confirmed_at = now()` uniquement si null (idempotent : une 2e
 * confirmation ne remet pas la date à jour). Scope (groupId, promoId,
 * projectName), insensible à la casse du projet pour matcher le suivi.
 */
export async function markRdvConfirmed(
  groupId: string,
  promoId: string,
  projectName: string,
): Promise<void> {
  await db
    .update(groupStatuses)
    .set({ rdvConfirmedAt: new Date() })
    .where(
      and(
        eq(groupStatuses.groupId, groupId),
        eq(groupStatuses.promoId, promoId),
        sql`lower(${groupStatuses.projectName}) = lower(${projectName})`,
        isNull(groupStatuses.rdvConfirmedAt),
      ),
    );
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

/**
 * « Reporter le RDV » : annule la réservation (RDV confirmé + créneau) et réarme
 * la relance auto → le groupe repasse en alerte (getOverdueGroups) et le cron
 * `notify-audit-groups` re-notifie le capitaine au prochain passage.
 */
export async function reopenRdv(id: number): Promise<void> {
  await db
    .update(groupStatuses)
    .set({
      rdvConfirmedAt: null,
      slotDate: null,
      slotEventId: null,
      slotBookedAt: null,
      slotAttendeeEmail: null,
      reminderSentAt: null,
      coachAlertedAt: null,
    })
    .where(eq(groupStatuses.id, id));
}

/**
 * Groupes RÉSERVÉS (RDV confirmé ou créneau lié) depuis ≥10 jours mais SANS
 * review saisie (aucune ligne `audits` pour ce groupe/projet), pas encore
 * signalés au coach. → alerte Teams unique (saisie manquante ou projet non audité).
 */
export async function getBookedWithoutReview(): Promise<(typeof groupStatuses.$inferSelect)[]> {
  const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000);
  const rows = await db
    .select({ gs: groupStatuses })
    .from(groupStatuses)
    .leftJoin(
      audits,
      and(
        eq(audits.groupId, groupStatuses.groupId),
        eq(audits.promoId, groupStatuses.promoId),
        sql`lower(${audits.projectName}) = lower(${groupStatuses.projectName})`,
      ),
    )
    .where(
      and(
        or(isNotNull(groupStatuses.rdvConfirmedAt), isNotNull(groupStatuses.slotBookedAt)),
        sql`coalesce(${groupStatuses.rdvConfirmedAt}, ${groupStatuses.slotBookedAt}) <= ${tenDaysAgo.toISOString()}`,
        isNull(groupStatuses.coachAlertedAt),
        sql`${groupStatuses.status} <> 'archived'`,
        isNull(audits.id),
      ),
    );
  return rows.map((r) => r.gs);
}

export async function markCoachAlerted(id: number): Promise<void> {
  await db
    .update(groupStatuses)
    .set({ coachAlertedAt: new Date() })
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
