import { db } from '../config';
import { students } from '../schema/students';
import { discordUsers } from '../schema/discordUsers';
import { auditReportRequests } from '../schema/auditReportRequests';
import { eq, and, inArray, isNull } from 'drizzle-orm';
import { zone01Graphql } from '@/lib/services/zone01-graphql';
import { getAllPromotions } from '@/lib/config/promotions';
import { getArchivedPromoNames } from '@/lib/db/filters';
import { isOlderThanBusinessDays } from '@/lib/utils/business-days';

const SINCE_DAYS_DEFAULT = 60;

interface RawAudit {
  auditorLogin: string | null;
  auditedAt: string | null;
  grade: number | null;
  group: { id: number; object: { name: string } | null } | null;
}

export interface AuditorEntry {
  login: string;
  /** Discord lié ? (peut recevoir le DM) */
  hasDiscord: boolean;
  /** Compte-rendu déjà demandé ? */
  requested: boolean;
  requestedAt: string | null;
  grade: number | null;
}

export interface AuditedProject {
  groupId: string;
  project: string;
  auditedAt: string | null;
  auditors: AuditorEntry[];
}

/**
 * Projets audités d'une promo (via GraphQL Zone01), avec la liste des auditeurs
 * (jusqu'à 5 par projet), leur statut Discord et si le compte-rendu a déjà été
 * demandé. Scoping promo = groupes dont un membre appartient à la promo.
 */
export async function getAuditedProjects(
  promoKey: string,
  sinceDays = SINCE_DAYS_DEFAULT,
): Promise<AuditedProject[]> {
  // Logins de la promo (actifs).
  const promoStudents = await db
    .select({ login: students.login })
    .from(students)
    .where(and(eq(students.promoName, promoKey), eq(students.isDropout, false)));
  const promoLogins = promoStudents.map((s) => s.login);
  if (promoLogins.length === 0) return [];

  const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();

  const query = `query($l:[String!], $s:timestamptz!){
    audit(
      where:{ auditedAt:{_gte:$s}, auditorLogin:{_is_null:false}, group:{ members:{ userLogin:{_in:$l} } } }
      order_by:{ auditedAt: desc }
      limit: 1000
    ){
      auditorLogin auditedAt grade
      group { id object { name } }
    }
  }`;

  const data = await zone01Graphql<{ audit: RawAudit[] }>(query, { l: promoLogins, s: since });

  // Regroupe par groupe audité.
  const byGroup = new Map<string, { project: string; auditedAt: string | null; auditors: Map<string, { grade: number | null }> }>();
  for (const a of data.audit) {
    if (!a.group || !a.auditorLogin) continue;
    const gid = String(a.group.id);
    const entry = byGroup.get(gid) ?? { project: a.group.object?.name ?? '—', auditedAt: a.auditedAt, auditors: new Map() };
    if (a.auditedAt && (!entry.auditedAt || a.auditedAt > entry.auditedAt)) entry.auditedAt = a.auditedAt;
    if (!entry.auditors.has(a.auditorLogin)) entry.auditors.set(a.auditorLogin, { grade: a.grade });
    byGroup.set(gid, entry);
  }

  // Discord + demandes déjà envoyées, en batch.
  const allAuditorLogins = [...new Set([...byGroup.values()].flatMap((g) => [...g.auditors.keys()]))];
  const discordSet = new Set<string>();
  const requestedSet = new Map<string, string>(); // `${login}:${gid}` -> requestedAt
  if (allAuditorLogins.length > 0) {
    const [discordRows, reqRows] = await Promise.all([
      db.select({ login: discordUsers.login }).from(discordUsers).where(inArray(discordUsers.login, allAuditorLogins)),
      db
        .select({ auditorLogin: auditReportRequests.auditorLogin, groupId: auditReportRequests.groupId, requestedAt: auditReportRequests.requestedAt })
        .from(auditReportRequests)
        .where(inArray(auditReportRequests.auditorLogin, allAuditorLogins)),
    ]);
    for (const d of discordRows) discordSet.add(d.login);
    for (const r of reqRows) requestedSet.set(`${r.auditorLogin}:${r.groupId}`, r.requestedAt.toISOString());
  }

  const projects: AuditedProject[] = [...byGroup.entries()].map(([gid, g]) => ({
    groupId: gid,
    project: g.project,
    auditedAt: g.auditedAt,
    auditors: [...g.auditors.entries()].map(([login, { grade }]) => ({
      login,
      hasDiscord: discordSet.has(login),
      requested: requestedSet.has(`${login}:${gid}`),
      requestedAt: requestedSet.get(`${login}:${gid}`) ?? null,
      grade,
    })),
  }));

  // Tri : projets les plus récemment audités d'abord.
  projects.sort((a, b) => (b.auditedAt ?? '').localeCompare(a.auditedAt ?? ''));
  return projects;
}

/** Enregistre une demande de compte-rendu (idempotent sur login+group). */
export async function recordAuditReportRequest(
  auditorLogin: string,
  groupId: string,
  projectName: string | null,
): Promise<void> {
  await db
    .insert(auditReportRequests)
    .values({ auditorLogin, groupId, projectName })
    .onConflictDoUpdate({
      target: [auditReportRequests.auditorLogin, auditReportRequests.groupId],
      set: { requestedAt: new Date(), projectName },
    });
}

/** Message Discord de demande de compte-rendu d'audit. */
export function buildAuditReportMessage(auditorLogin: string, project: string, groupId: string): string {
  return [
    `Hey ${auditorLogin} ! 👋`,
    ``,
    `Comment s'est passé l'audit de **${project}** (groupe ${groupId}) ?`,
    `Peux-tu nous envoyer un court **compte-rendu** : déroulé, points forts/faibles, et soucis éventuels ?`,
    ``,
    `Merci pour ton retour, ça aide à suivre la qualité des audits ! 🙏`,
  ].join('\n');
}

export interface AuditorToRequest {
  auditorLogin: string;
  discordId: string;
  groupId: string;
  project: string;
}

/**
 * Chantier D (auto) — auditeurs à solliciter automatiquement : groupes passés
 * `finished` (audits terminés) sur les `sinceDays` derniers jours, toutes promos
 * actives confondues, dont l'auditeur a un Discord lié et n'a pas déjà été
 * sollicité pour ce groupe. Déclencheur côté cron.
 */
export async function getFinishedAuditorsToRequest(sinceDays = 7): Promise<AuditorToRequest[]> {
  const [promoConfig, archived] = await Promise.all([getAllPromotions(), getArchivedPromoNames()]);
  const activeKeys = promoConfig.filter((p) => !archived.has(p.key)).map((p) => p.key);
  if (activeKeys.length === 0) return [];

  const promoStudents = await db
    .select({ login: students.login })
    .from(students)
    .where(and(inArray(students.promoName, activeKeys), eq(students.isDropout, false)));
  const promoLogins = promoStudents.map((s) => s.login);
  if (promoLogins.length === 0) return [];

  const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
  const query = `query($l:[String!], $s:timestamptz!){
    audit(
      where:{ auditedAt:{_gte:$s}, auditorLogin:{_is_null:false}, group:{ status:{_eq:finished}, members:{ userLogin:{_in:$l} } } }
      order_by:{ auditedAt: desc }
      limit: 2000
    ){ auditorLogin group { id object { name } } }
  }`;
  const data = await zone01Graphql<{ audit: RawAudit[] }>(query, { l: promoLogins, s: since });

  // Dédup (auditorLogin, groupId).
  const pairs = new Map<string, { auditorLogin: string; groupId: string; project: string }>();
  for (const a of data.audit) {
    if (!a.group || !a.auditorLogin) continue;
    const gid = String(a.group.id);
    pairs.set(`${a.auditorLogin}:${gid}`, {
      auditorLogin: a.auditorLogin,
      groupId: gid,
      project: a.group.object?.name ?? '—',
    });
  }
  if (pairs.size === 0) return [];

  const logins = [...new Set([...pairs.values()].map((p) => p.auditorLogin))];
  const [discordRows, reqRows] = await Promise.all([
    db.select({ login: discordUsers.login, discordId: discordUsers.discordId }).from(discordUsers).where(inArray(discordUsers.login, logins)),
    db.select({ auditorLogin: auditReportRequests.auditorLogin, groupId: auditReportRequests.groupId }).from(auditReportRequests).where(inArray(auditReportRequests.auditorLogin, logins)),
  ]);
  const discordByLogin = new Map(discordRows.map((d) => [d.login, d.discordId]));
  const alreadyRequested = new Set(reqRows.map((r) => `${r.auditorLogin}:${r.groupId}`));

  const out: AuditorToRequest[] = [];
  for (const [key, p] of pairs) {
    if (alreadyRequested.has(key)) continue;
    const discordId = discordByLogin.get(p.auditorLogin);
    if (!discordId) continue; // pas de Discord → on ne peut pas DM (et on ne marque pas)
    out.push({ auditorLogin: p.auditorLogin, discordId, groupId: p.groupId, project: p.project });
  }
  return out;
}

/** Nombre de jours ouvrés sans réponse avant escalade (Feature 7). */
const ESCALATE_AFTER_BUSINESS_DAYS = 2;

/**
 * Feature 6 — enregistre la réponse d'un auditeur à la demande de compte-rendu
 * (modal du bot). Set `responded_at = now`, `response_status`, `response_comment`
 * pour la paire (auditorLogin, groupId). No-op si la demande n'existe pas.
 */
export async function markAuditResponded(
  auditorLogin: string,
  groupId: string,
  status: string,
  comment: string | null,
): Promise<void> {
  await db
    .update(auditReportRequests)
    .set({
      respondedAt: new Date(),
      responseStatus: status.slice(0, 50),
      responseComment: comment ? comment.slice(0, 2000) : null,
    })
    .where(
      and(
        eq(auditReportRequests.auditorLogin, auditorLogin),
        eq(auditReportRequests.groupId, groupId),
      ),
    );
}

export interface AuditRequestToEscalate {
  id: number;
  auditorLogin: string;
  groupId: string;
  projectName: string | null;
  requestedAt: Date;
}

/**
 * Feature 7 — demandes de compte-rendu à escalader : `requested_at` plus vieux
 * que {@link ESCALATE_AFTER_BUSINESS_DAYS} jours ouvrés, sans réponse, et pas
 * encore escaladées. Le filtre « jours ouvrés » est appliqué en JS (week-ends +
 * jours fériés/vacances) car non exprimable en SQL pur.
 */
export async function getAuditRequestsToEscalate(): Promise<AuditRequestToEscalate[]> {
  const rows = await db
    .select({
      id: auditReportRequests.id,
      auditorLogin: auditReportRequests.auditorLogin,
      groupId: auditReportRequests.groupId,
      projectName: auditReportRequests.projectName,
      requestedAt: auditReportRequests.requestedAt,
    })
    .from(auditReportRequests)
    .where(
      and(
        isNull(auditReportRequests.respondedAt),
        isNull(auditReportRequests.escalatedAt),
      ),
    );

  const out: AuditRequestToEscalate[] = [];
  for (const r of rows) {
    // eslint-disable-next-line no-await-in-loop
    if (await isOlderThanBusinessDays(r.requestedAt, ESCALATE_AFTER_BUSINESS_DAYS)) {
      out.push(r);
    }
  }
  return out;
}

/** Feature 7 — marque une demande comme escaladée (Teams envoyé). */
export async function markAuditEscalated(id: number): Promise<void> {
  await db
    .update(auditReportRequests)
    .set({ escalatedAt: new Date() })
    .where(eq(auditReportRequests.id, id));
}

export { SINCE_DAYS_DEFAULT, ESCALATE_AFTER_BUSINESS_DAYS };
