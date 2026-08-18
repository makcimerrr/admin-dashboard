import 'server-only';
import {
  computeDueDate,
  isMilestoneRelevant,
  isSameDay,
} from '@/lib/services/follow-up-templates';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../config';
import {
  followUpMilestoneTypes,
  followUpMilestones,
  followUpReminders,
  followUpReports,
  followUpSettings,
  CLOSED_MILESTONE_STATUSES,
  type FollowUpMilestone,
  type FollowUpMilestoneType,
  type FollowUpReminder,
  type FollowUpReport,
  type FollowUpSettings,
  type MilestoneStatus,
  type NewFollowUpMilestoneType,
  type NewFollowUpReminder,
  type NewFollowUpReport,
} from '../schema/followUps';
import { alternantContracts } from '../schema/alternants';
import { students } from '../schema/students';

/**
 * Module « Suivi en entreprise » — accès données.
 *
 * Le cœur est `reconcileMilestones()` : à partir des contrats et des jalons
 * configurés en base, il (re)pose les échéances de façon IDEMPOTENTE. Il est
 * appelé après chaque synchro émargement, après création/édition d'un contrat,
 * et par le cron quotidien — le rejouer n'a jamais d'effet de bord.
 */

// ─── Jalons configurables ────────────────────────────────────────────────────

export async function getMilestoneTypes(
  { activeOnly = false }: { activeOnly?: boolean } = {},
): Promise<FollowUpMilestoneType[]> {
  const rows = await db
    .select()
    .from(followUpMilestoneTypes)
    .orderBy(asc(followUpMilestoneTypes.displayOrder), asc(followUpMilestoneTypes.offsetMonths));
  return activeOnly ? rows.filter((t) => t.isActive) : rows;
}

export async function upsertMilestoneType(
  data: NewFollowUpMilestoneType,
): Promise<FollowUpMilestoneType> {
  const [row] = await db
    .insert(followUpMilestoneTypes)
    .values(data)
    .onConflictDoUpdate({
      target: followUpMilestoneTypes.code,
      set: {
        label: data.label,
        offsetMonths: data.offsetMonths,
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
        updatedAt: new Date(),
      },
    })
    .returning();
  return row;
}

/**
 * Désactive un jalon. On ne SUPPRIME jamais : les échéances déjà posées (et les
 * comptes rendus qui y sont rattachés) doivent rester lisibles.
 */
export async function deactivateMilestoneType(code: string): Promise<void> {
  await db
    .update(followUpMilestoneTypes)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(followUpMilestoneTypes.code, code));
}

// ─── Réglages ────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: FollowUpSettings = {
  id: 1,
  internalAlertLeadDays: 30,
  reminderLeadDays: 21,
  secondReminderAfterDays: 10,
  bookingUrl: null,
  watchedCalendarId: null,
  senderName: null,
  senderEmail: null,
  replyToEmail: null,
  emailSubjectTemplate: null,
  emailBodyTemplate: null,
  teamsAlertsEnabled: true,
  updatedAt: new Date(0),
  updatedBy: null,
};

export async function getFollowUpSettings(): Promise<FollowUpSettings> {
  const [row] = await db.select().from(followUpSettings).where(eq(followUpSettings.id, 1)).limit(1);
  return row ?? DEFAULT_SETTINGS;
}

export async function updateFollowUpSettings(
  data: Partial<FollowUpSettings>,
  updatedBy?: string,
): Promise<FollowUpSettings> {
  const { id: _ignored, ...patch } = data;
  const [row] = await db
    .insert(followUpSettings)
    .values({ id: 1, ...patch, updatedBy, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: followUpSettings.id,
      set: { ...patch, updatedBy, updatedAt: new Date() },
    })
    .returning();
  return row;
}

// ─── Réconciliation des échéances ────────────────────────────────────────────

export interface ReconcileResult {
  created: number;
  updated: number;
  cancelled: number;
  restored: number;
  contractsScanned: number;
}

/**
 * (Re)pose les échéances de suivi pour les contrats donnés (tous si non
 * précisé). Idempotent :
 *  - jalon manquant et pertinent  → créé (`a_venir`)
 *  - date de début modifiée       → `due_date` recalculée (statut conservé)
 *  - jalon au-delà de la fin de contrat, ou type désactivé → `annule`
 *  - contrat prolongé / type réactivé → l'échéance annulée repasse `a_venir`
 *
 * Une échéance `realise` n'est JAMAIS touchée : le suivi a eu lieu, le compte
 * rendu existe.
 */
export async function reconcileMilestones(
  { contractIds, studentIds }: { contractIds?: number[]; studentIds?: number[] } = {},
): Promise<ReconcileResult> {
  const types = await getMilestoneTypes();

  const filters = [];
  if (contractIds?.length) filters.push(inArray(alternantContracts.id, contractIds));
  if (studentIds?.length) filters.push(inArray(alternantContracts.studentId, studentIds));

  const contracts = await db
    .select({
      id: alternantContracts.id,
      studentId: alternantContracts.studentId,
      startDate: alternantContracts.startDate,
      endDate: alternantContracts.endDate,
    })
    .from(alternantContracts)
    .where(filters.length ? and(...filters) : undefined);

  if (contracts.length === 0) {
    return { created: 0, updated: 0, cancelled: 0, restored: 0, contractsScanned: 0 };
  }

  const existing = await db
    .select()
    .from(followUpMilestones)
    .where(
      inArray(
        followUpMilestones.contractId,
        contracts.map((c) => c.id),
      ),
    );

  const byKey = new Map<string, FollowUpMilestone>();
  for (const m of existing) byKey.set(`${m.contractId}|${m.typeCode}`, m);

  const toInsert: (typeof followUpMilestones.$inferInsert)[] = [];
  const result: ReconcileResult = {
    created: 0,
    updated: 0,
    cancelled: 0,
    restored: 0,
    contractsScanned: contracts.length,
  };
  const now = new Date();

  for (const contract of contracts) {
    for (const type of types) {
      const key = `${contract.id}|${type.code}`;
      const current = byKey.get(key);
      const due = computeDueDate(contract.startDate, type.offsetMonths);
      const relevant = isMilestoneRelevant(due, contract.endDate, type.isActive);
      // Distingue « hors contrat » de « jalon désactivé » pour le motif d'annulation.
      const beyondContract = due.getTime() > contract.endDate.getTime();

      if (!current) {
        if (!relevant) continue; // rien à créer pour un jalon hors périmètre
        toInsert.push({
          contractId: contract.id,
          studentId: contract.studentId,
          typeCode: type.code,
          dueDate: due,
          status: 'a_venir',
          statusChangedAt: now,
        });
        continue;
      }

      // Le suivi a eu lieu : intouchable.
      if (current.status === 'realise') continue;

      if (!relevant) {
        if (current.status !== 'annule') {
          await db
            .update(followUpMilestones)
            .set({
              status: 'annule',
              statusChangedAt: now,
              cancelReason: beyondContract
                ? 'Au-delà de la fin de contrat'
                : 'Jalon désactivé dans la configuration',
              updatedAt: now,
            })
            .where(eq(followUpMilestones.id, current.id));
          result.cancelled++;
        }
        continue;
      }

      // Jalon redevenu pertinent (contrat prolongé, type réactivé).
      if (current.status === 'annule') {
        await db
          .update(followUpMilestones)
          .set({
            status: 'a_venir',
            statusChangedAt: now,
            cancelReason: null,
            dueDate: due,
            updatedAt: now,
          })
          .where(eq(followUpMilestones.id, current.id));
        result.restored++;
        continue;
      }

      // Date de début corrigée côté émargement → on décale l'échéance.
      if (!isSameDay(current.dueDate, due)) {
        await db
          .update(followUpMilestones)
          .set({ dueDate: due, updatedAt: now })
          .where(eq(followUpMilestones.id, current.id));
        result.updated++;
      }
    }
  }

  if (toInsert.length > 0) {
    // onConflictDoNothing : deux réconciliations concurrentes (cron + synchro
    // manuelle) ne doivent pas se casser dessus.
    const inserted = await db
      .insert(followUpMilestones)
      .values(toInsert)
      .onConflictDoNothing()
      .returning({ id: followUpMilestones.id });
    result.created = inserted.length;
  }

  return result;
}

// ─── Lecture pour l'UI ───────────────────────────────────────────────────────

export interface MilestoneRow {
  id: number;
  contractId: number;
  studentId: number;
  typeCode: string;
  typeLabel: string;
  dueDate: string;
  status: MilestoneStatus;
  scheduledAt: string | null;
  completedAt: string | null;
  calendarEventId: string | null;
  notes: string | null;
  /** Apprenant */
  login: string;
  firstName: string;
  lastName: string;
  promoName: string;
  /** Contrat / entreprise */
  contractType: string;
  contractStart: string;
  contractEnd: string;
  companyName: string;
  tutorName: string | null;
  tutorEmail: string | null;
  tutorPhone: string | null;
  /** Dernière relance envoyée (tous canaux confondus). */
  lastReminderAt: string | null;
  reminderCount: number;
  /** Nombre de jours avant l'échéance (négatif = en retard). */
  daysUntilDue: number;
}

export interface MilestoneFilters {
  id?: number;
  status?: MilestoneStatus[];
  studentId?: number;
  company?: string;
  /** Bornes sur la date d'échéance (ISO). */
  dueBefore?: Date;
  dueAfter?: Date;
  /** Inclut les échéances closes (realise/annule). Faux par défaut. */
  includeClosed?: boolean;
}

export async function listMilestones(filters: MilestoneFilters = {}): Promise<MilestoneRow[]> {
  const where = [];
  if (filters.id) where.push(eq(followUpMilestones.id, filters.id));
  if (filters.status?.length) {
    where.push(inArray(followUpMilestones.status, filters.status));
  } else if (!filters.includeClosed) {
    where.push(sql`${followUpMilestones.status} NOT IN ('realise', 'annule')`);
  }
  if (filters.studentId) where.push(eq(followUpMilestones.studentId, filters.studentId));
  if (filters.company) where.push(eq(alternantContracts.companyName, filters.company));
  if (filters.dueBefore) where.push(sql`${followUpMilestones.dueDate} <= ${filters.dueBefore}`);
  if (filters.dueAfter) where.push(sql`${followUpMilestones.dueDate} >= ${filters.dueAfter}`);

  const rows = await db
    .select({
      id: followUpMilestones.id,
      contractId: followUpMilestones.contractId,
      studentId: followUpMilestones.studentId,
      typeCode: followUpMilestones.typeCode,
      typeLabel: followUpMilestoneTypes.label,
      dueDate: followUpMilestones.dueDate,
      status: followUpMilestones.status,
      scheduledAt: followUpMilestones.scheduledAt,
      completedAt: followUpMilestones.completedAt,
      calendarEventId: followUpMilestones.calendarEventId,
      notes: followUpMilestones.notes,
      login: students.login,
      firstName: students.first_name,
      lastName: students.last_name,
      promoName: students.promoName,
      contractType: alternantContracts.contractType,
      contractStart: alternantContracts.startDate,
      contractEnd: alternantContracts.endDate,
      companyName: alternantContracts.companyName,
      tutorName: alternantContracts.tutorName,
      tutorEmail: alternantContracts.tutorEmail,
      tutorPhone: alternantContracts.tutorPhone,
      lastReminderAt: sql<Date | null>`(
        SELECT MAX(r.sent_at) FROM follow_up_reminders r
        WHERE r.milestone_id = ${followUpMilestones.id} AND r.status = 'sent'
      )`,
      reminderCount: sql<number>`(
        SELECT COUNT(*)::int FROM follow_up_reminders r
        WHERE r.milestone_id = ${followUpMilestones.id} AND r.status = 'sent'
      )`,
    })
    .from(followUpMilestones)
    .innerJoin(alternantContracts, eq(alternantContracts.id, followUpMilestones.contractId))
    .innerJoin(students, eq(students.id, followUpMilestones.studentId))
    .innerJoin(
      followUpMilestoneTypes,
      eq(followUpMilestoneTypes.code, followUpMilestones.typeCode),
    )
    .where(where.length ? and(...where) : undefined)
    .orderBy(asc(followUpMilestones.dueDate));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return rows.map((r) => ({
    ...r,
    status: r.status as MilestoneStatus,
    dueDate: r.dueDate.toISOString(),
    scheduledAt: r.scheduledAt?.toISOString() ?? null,
    completedAt: r.completedAt?.toISOString() ?? null,
    contractStart: r.contractStart.toISOString(),
    contractEnd: r.contractEnd.toISOString(),
    lastReminderAt: r.lastReminderAt ? new Date(r.lastReminderAt).toISOString() : null,
    daysUntilDue: Math.round(
      (new Date(r.dueDate).setHours(0, 0, 0, 0) - today.getTime()) / 86_400_000,
    ),
  }));
}

export async function getMilestoneById(id: number): Promise<MilestoneRow | null> {
  const [row] = await listMilestones({ id, includeClosed: true });
  return row ?? null;
}

// ─── Changements de statut ───────────────────────────────────────────────────

export async function setMilestoneStatus(
  id: number,
  status: MilestoneStatus,
  extra: {
    scheduledAt?: Date | null;
    notes?: string;
    cancelReason?: string;
    calendarEventId?: string | null;
  } = {},
): Promise<FollowUpMilestone | null> {
  const now = new Date();
  const [row] = await db
    .update(followUpMilestones)
    .set({
      status,
      statusChangedAt: now,
      updatedAt: now,
      ...(extra.scheduledAt !== undefined ? { scheduledAt: extra.scheduledAt } : {}),
      ...(extra.notes !== undefined ? { notes: extra.notes } : {}),
      ...(extra.cancelReason !== undefined ? { cancelReason: extra.cancelReason } : {}),
      ...(extra.calendarEventId !== undefined
        ? { calendarEventId: extra.calendarEventId }
        : {}),
      ...(status === 'realise' ? { completedAt: now } : {}),
    })
    .where(eq(followUpMilestones.id, id))
    .returning();
  return row ?? null;
}

// ─── Relances ────────────────────────────────────────────────────────────────

export async function recordReminder(data: NewFollowUpReminder): Promise<FollowUpReminder> {
  const [row] = await db.insert(followUpReminders).values(data).returning();
  return row;
}

export async function getRemindersForMilestone(
  milestoneId: number,
): Promise<FollowUpReminder[]> {
  return db
    .select()
    .from(followUpReminders)
    .where(eq(followUpReminders.milestoneId, milestoneId))
    .orderBy(desc(followUpReminders.sentAt));
}

// ─── Comptes rendus ──────────────────────────────────────────────────────────

/**
 * Enregistre un compte rendu et clôt l'échéance associée (statut `realise`).
 */
export async function createFollowUpReport(data: NewFollowUpReport): Promise<FollowUpReport> {
  const [row] = await db.insert(followUpReports).values(data).returning();
  if (data.milestoneId) {
    await setMilestoneStatus(data.milestoneId, 'realise');
  }
  return row;
}

export async function updateFollowUpReport(
  id: number,
  data: Partial<NewFollowUpReport>,
): Promise<FollowUpReport | null> {
  const [row] = await db
    .update(followUpReports)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(followUpReports.id, id))
    .returning();
  return row ?? null;
}

export async function deleteFollowUpReport(id: number): Promise<boolean> {
  const rows = await db.delete(followUpReports).where(eq(followUpReports.id, id)).returning();
  return rows.length > 0;
}

export interface ReportRow extends FollowUpReport {
  login: string;
  firstName: string;
  lastName: string;
  promoName: string;
  milestoneLabel: string | null;
}

/**
 * Historique des comptes rendus, filtrable par apprenant ou par entreprise
 * (recherche « tous les CR de telle boîte »).
 */
export async function listFollowUpReports(
  { studentId, company, limit = 200 }: { studentId?: number; company?: string; limit?: number } = {},
): Promise<ReportRow[]> {
  const where = [];
  if (studentId) where.push(eq(followUpReports.studentId, studentId));
  if (company) where.push(eq(followUpReports.companyName, company));

  const rows = await db
    .select({
      report: followUpReports,
      login: students.login,
      firstName: students.first_name,
      lastName: students.last_name,
      promoName: students.promoName,
      milestoneLabel: followUpMilestoneTypes.label,
    })
    .from(followUpReports)
    .innerJoin(students, eq(students.id, followUpReports.studentId))
    .leftJoin(followUpMilestones, eq(followUpMilestones.id, followUpReports.milestoneId))
    .leftJoin(
      followUpMilestoneTypes,
      eq(followUpMilestoneTypes.code, followUpMilestones.typeCode),
    )
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(followUpReports.performedAt))
    .limit(limit);

  return rows.map((r) => ({
    ...r.report,
    login: r.login,
    firstName: r.firstName,
    lastName: r.lastName,
    promoName: r.promoName,
    milestoneLabel: r.milestoneLabel,
  }));
}

// ─── Statistiques (bandeau de la page) ───────────────────────────────────────

export interface FollowUpStats {
  overdue: number;
  dueSoon: number;
  awaitingReply: number;
  scheduled: number;
  doneThisYear: number;
}

export async function getFollowUpStats(): Promise<FollowUpStats> {
  const settings = await getFollowUpSettings();
  const open = await listMilestones();
  const lead = settings.internalAlertLeadDays;

  const startOfYear = new Date(new Date().getFullYear(), 0, 1);
  const [doneRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(followUpReports)
    .where(sql`${followUpReports.performedAt} >= ${startOfYear}`);

  return {
    overdue: open.filter((m) => m.daysUntilDue < 0).length,
    dueSoon: open.filter((m) => m.daysUntilDue >= 0 && m.daysUntilDue <= lead).length,
    awaitingReply: open.filter((m) => m.status === 'relance_envoyee').length,
    scheduled: open.filter((m) => m.status === 'rdv_planifie').length,
    doneThisYear: Number(doneRow?.count ?? 0),
  };
}

export { CLOSED_MILESTONE_STATUSES };
