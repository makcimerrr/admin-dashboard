import { db } from '../config';
import { audits } from '../schema/audits';
import { students } from '../schema/students';
import { promoCrTargets } from '../schema/crTargets';
import { sql, inArray } from 'drizzle-orm';
import { getAllForSuivi } from './groupStatuses';
import { getAllPromotions } from '@/lib/config/promotions';
import { getArchivedPromoNames } from '@/lib/db/filters';

const STUCK_DAYS = 7; // capitaine notifié depuis ≥ 7j sans réservation ni audit

export interface CrPromoCockpit {
  promoId: string;
  promoName: string;
  /** Audits réalisés cette semaine / semaine précédente. */
  auditsThisWeek: number;
  auditsLastWeek: number;
  /** Total audits réalisés (sur l'historique). */
  auditsTotal: number;
  /** Tendance : audits par semaine sur les 8 dernières semaines (ancien → récent). */
  trend: number[];
  /** Groupes en attente d'audit (pipeline). */
  pending: number;
  /** Notifiés mais ni créneau réservé ni audit. */
  awaitingResponse: number;
  /** Notifiés depuis ≥ 7j, sans réservation ni audit (capitaines non réactifs). */
  stuck: number;
  /** Bloqueurs : pending sans capitaine ou sans Discord. */
  noCaptain: number;
  noDiscord: number;
  /** Objectif hebdomadaire (0 = non défini). */
  weeklyTarget: number;
}

export interface CrCockpit {
  promos: CrPromoCockpit[];
  totals: {
    auditsThisWeek: number;
    auditsLastWeek: number;
    pending: number;
    stuck: number;
    weeklyTarget: number;
  };
  weekStarts: string[]; // 8 lundis (ISO date), ancien → récent
}

/** Lundi (UTC) de la semaine d'une date, à 00:00. */
function mondayOf(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay(); // 0=dim
  const diff = day === 0 ? 6 : day - 1;
  x.setUTCDate(x.getUTCDate() - diff);
  return x;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getCrCockpit(nowMs: number): Promise<CrCockpit> {
  const now = new Date(nowMs);
  const thisMonday = mondayOf(now);
  // 8 lundis consécutifs (ancien → récent).
  const weekStarts: Date[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(thisMonday);
    d.setUTCDate(d.getUTCDate() - i * 7);
    weekStarts.push(d);
  }
  const weekStartStrings = weekStarts.map(isoDate);
  const thisWeekStr = weekStartStrings[7];
  const lastWeekStr = weekStartStrings[6];

  const [rows, weeklyRaw, targets, promoConfig, archivedNames] = await Promise.all([
    getAllForSuivi(),
    // Audits par (semaine ISO, promo) sur ~8 semaines.
    db.execute(sql`
      SELECT to_char(date_trunc('week', ${audits.createdAt}), 'YYYY-MM-DD') AS wk,
             ${audits.promoId} AS promo_id,
             count(*)::int AS cnt
      FROM ${audits}
      WHERE ${audits.createdAt} >= ${isoDate(weekStarts[0])}
      GROUP BY 1, 2
    `),
    db.select().from(promoCrTargets),
    getAllPromotions(),
    getArchivedPromoNames(),
  ]);

  // Totaux d'audits (tous temps) par promo.
  const totalRaw = await db.execute(sql`
    SELECT ${audits.promoId} AS promo_id, count(*)::int AS cnt FROM ${audits} GROUP BY 1
  `);
  const totalByPromo = new Map<string, number>();
  for (const r of (totalRaw as any).rows ?? totalRaw) {
    totalByPromo.set(String(r.promo_id), Number(r.cnt));
  }

  // weekly[promoId][weekStr] = count
  const weekly = new Map<string, Map<string, number>>();
  for (const r of (weeklyRaw as any).rows ?? weeklyRaw) {
    const pid = String(r.promo_id);
    if (!weekly.has(pid)) weekly.set(pid, new Map());
    weekly.get(pid)!.set(String(r.wk), Number(r.cnt));
  }

  const targetByPromo = new Map(targets.map((t) => [t.promoId, t.weeklyTarget]));

  // Promos actives (non archivées) ; promoId = eventId string.
  const activePromos = promoConfig.filter((p) => !archivedNames.has(p.key));

  // Agrégation pipeline par promo depuis les rows suivi.
  const nowT = now.getTime();
  const byPromo = new Map<string, { pending: number; awaiting: number; stuck: number; noCaptain: number; noDiscord: number }>();
  for (const r of rows) {
    const agg = byPromo.get(r.promoId) ?? { pending: 0, awaiting: 0, stuck: 0, noCaptain: 0, noDiscord: 0 };
    const done = r.auditId != null;
    if (!done) {
      agg.pending += 1;
      if (!r.captainLogin) agg.noCaptain += 1;
      else if (!r.hasDiscordId) agg.noDiscord += 1;
      const notified = r.notifiedAuditAt != null;
      const booked = r.slotBookedAt != null;
      if (notified && !booked) {
        agg.awaiting += 1;
        const ageDays = (nowT - new Date(r.notifiedAuditAt as Date).getTime()) / 86_400_000;
        if (ageDays >= STUCK_DAYS) agg.stuck += 1;
      }
    }
    byPromo.set(r.promoId, agg);
  }

  const promos: CrPromoCockpit[] = activePromos.map((p) => {
    const pid = String(p.eventId);
    const wk = weekly.get(pid) ?? new Map<string, number>();
    const trend = weekStartStrings.map((w) => wk.get(w) ?? 0);
    const agg = byPromo.get(pid) ?? { pending: 0, awaiting: 0, stuck: 0, noCaptain: 0, noDiscord: 0 };
    return {
      promoId: pid,
      promoName: p.title || p.key,
      auditsThisWeek: wk.get(thisWeekStr) ?? 0,
      auditsLastWeek: wk.get(lastWeekStr) ?? 0,
      auditsTotal: totalByPromo.get(pid) ?? 0,
      trend,
      pending: agg.pending,
      awaitingResponse: agg.awaiting,
      stuck: agg.stuck,
      noCaptain: agg.noCaptain,
      noDiscord: agg.noDiscord,
      weeklyTarget: targetByPromo.get(pid) ?? 0,
    };
  });

  // Tri : plus de "stuck" d'abord (là où il faut agir), puis pending.
  promos.sort((a, b) => b.stuck - a.stuck || b.pending - a.pending);

  const totals = promos.reduce(
    (acc, p) => {
      acc.auditsThisWeek += p.auditsThisWeek;
      acc.auditsLastWeek += p.auditsLastWeek;
      acc.pending += p.pending;
      acc.stuck += p.stuck;
      acc.weeklyTarget += p.weeklyTarget;
      return acc;
    },
    { auditsThisWeek: 0, auditsLastWeek: 0, pending: 0, stuck: 0, weeklyTarget: 0 },
  );

  return { promos, totals, weekStarts: weekStartStrings };
}

// ─── Recap hebdo (semaine écoulée) ───────────────────────────────────────────

export interface WeeklyRecap {
  /** Bornes de la semaine écoulée (ISO date). */
  weekStart: string;
  weekEnd: string;
  /** CR réalisées pendant la semaine écoulée. */
  auditsLastWeek: number;
  /** Chefs de groupe contactés (notifiés) sans CR pris (ni créneau ni audit). */
  captains: { name: string; promo: string }[];
}

/**
 * Données du recap hebdo : porte sur la SEMAINE ÉCOULÉE (lundi → dimanche
 * précédents). Liste les capitaines contactés qui n'ont pas pris de CR, avec
 * leur promo. Dédupliqué par login, trié du plus anciennement contacté au plus
 * récent (les plus urgents d'abord).
 */
export async function getWeeklyRecap(nowMs: number): Promise<WeeklyRecap> {
  const thisMonday = mondayOf(new Date(nowMs));
  const lastMonday = new Date(thisMonday);
  lastMonday.setUTCDate(lastMonday.getUTCDate() - 7);
  const lastSunday = new Date(thisMonday);
  lastSunday.setUTCDate(lastSunday.getUTCDate() - 1);

  const [rows, promoConfig, lastWeekRaw] = await Promise.all([
    getAllForSuivi(),
    getAllPromotions(),
    db.execute(sql`
      SELECT count(*)::int AS cnt FROM ${audits}
      WHERE ${audits.createdAt} >= ${isoDate(lastMonday)}
        AND ${audits.createdAt} < ${isoDate(thisMonday)}
    `),
  ]);

  const auditsLastWeek = Number(((lastWeekRaw as any).rows ?? lastWeekRaw)[0]?.cnt ?? 0);

  // eventId(string) → clé promo courte (ex: "P1 2024").
  const promoKeyById = new Map(promoConfig.map((p) => [String(p.eventId), p.key]));

  // Capitaines contactés sans CR : notifié, pas de créneau réservé, pas d'audit.
  const contacted = rows.filter(
    (r) => r.captainLogin && r.notifiedAuditAt != null && r.slotBookedAt == null && r.auditId == null,
  );

  // Dédup par login (garde le contact le plus ancien).
  const byLogin = new Map<string, { login: string; promoId: string; notifiedAt: number }>();
  for (const r of contacted) {
    const login = r.captainLogin as string;
    const notifiedAt = new Date(r.notifiedAuditAt as Date).getTime();
    const existing = byLogin.get(login);
    if (!existing || notifiedAt < existing.notifiedAt) {
      byLogin.set(login, { login, promoId: r.promoId, notifiedAt });
    }
  }

  // Résolution login → "Prénom Nom".
  const logins = [...byLogin.keys()];
  const nameByLogin = new Map<string, string>();
  if (logins.length > 0) {
    const studentRows = await db
      .select({ login: students.login, firstName: students.first_name, lastName: students.last_name })
      .from(students)
      .where(inArray(students.login, logins));
    for (const s of studentRows) {
      nameByLogin.set(s.login, `${s.firstName} ${s.lastName}`.trim());
    }
  }

  const captains = [...byLogin.values()]
    .sort((a, b) => a.notifiedAt - b.notifiedAt)
    .map((c) => ({
      name: nameByLogin.get(c.login) || c.login,
      promo: promoKeyById.get(c.promoId) ?? c.promoId,
    }));

  return {
    weekStart: isoDate(lastMonday),
    weekEnd: isoDate(lastSunday),
    auditsLastWeek,
    captains,
  };
}

export async function setCrTarget(promoId: string, weeklyTarget: number): Promise<void> {
  await db
    .insert(promoCrTargets)
    .values({ promoId, weeklyTarget })
    .onConflictDoUpdate({
      target: promoCrTargets.promoId,
      set: { weeklyTarget, updatedAt: new Date() },
    });
}
