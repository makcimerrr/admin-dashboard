import { db } from '../config';
import { students } from '../schema/students';
import { discordUsers } from '../schema/discordUsers';
import { auditReportRequests } from '../schema/auditReportRequests';
import { eq, and, inArray, isNull } from 'drizzle-orm';
import { zone01Graphql } from '@/lib/services/zone01-graphql';
import { getAllPromotions } from '@/lib/config/promotions';
import { getMandatoryProjectNames } from '@/lib/config/projects';
import { getArchivedPromoNames } from '@/lib/db/filters';
import { isOlderThanBusinessDays } from '@/lib/utils/business-days';

const SINCE_DAYS_DEFAULT = 60;

interface RawAudit {
  auditorLogin: string | null;
  auditedAt: string | null;
  grade: number | null;
  group: {
    id: number;
    object: { name: string } | null;
    members?: { userLogin: string }[] | null;
  } | null;
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

/**
 * Message Discord de demande de compte-rendu d'audit.
 * `members` = noms des membres du groupe AUDITÉ (réalisé par un AUTRE groupe).
 * Vide → on retombe sur « un autre groupe » sans parenthèse.
 */
export function buildAuditReportMessage(auditorLogin: string, project: string, members: string): string {
  const author = members.trim() ? `un autre groupe (${members.trim()})` : `un autre groupe`;
  return [
    `Hey ${auditorLogin} ! 👋`,
    ``,
    `Tu as récemment **audité** le projet **${project}** réalisé par ${author}.`,
    `En tant qu'**auditeur**, peux-tu nous envoyer un court **compte-rendu de l'audit que tu as mené** : déroulé, points forts/faibles, soucis éventuels ?`,
    ``,
    `(Il s'agit bien de l'audit que TU as fait, pas de ton propre projet.)`,
    ``,
    `Merci pour ton retour, ça aide à suivre la qualité des audits ! 🙏`,
  ].join('\n');
}

export interface AuditorToRequest {
  auditorLogin: string;
  discordId: string;
  groupId: string;
  project: string;
  /** Noms d'affichage des membres du groupe audité, ex. « Jean Dupont, Marie Martin ». */
  members: string;
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
    ){ auditorLogin group { id object { name } members { userLogin } } }
  }`;
  const data = await zone01Graphql<{ audit: RawAudit[] }>(query, { l: promoLogins, s: since });

  // Dédup (auditorLogin, groupId). Collecte aussi les logins des membres du
  // groupe AUDITÉ (réalisé par un autre groupe) pour résoudre des noms ensuite.
  // Ne demander des comptes-rendus que pour les projets OBLIGATOIRES du tronc
  // commun (exclut optionnels, bonus, piscine/additionnels).
  const mandatory = await getMandatoryProjectNames();
  const pairs = new Map<string, { auditorLogin: string; groupId: string; project: string; memberLogins: string[] }>();
  for (const a of data.audit) {
    if (!a.group || !a.auditorLogin) continue;
    if (!mandatory.has((a.group.object?.name ?? '').toLowerCase())) continue;
    const gid = String(a.group.id);
    pairs.set(`${a.auditorLogin}:${gid}`, {
      auditorLogin: a.auditorLogin,
      groupId: gid,
      project: a.group.object?.name ?? '—',
      memberLogins: (a.group.members ?? []).map((m) => m.userLogin).filter(Boolean),
    });
  }
  if (pairs.size === 0) return [];

  const logins = [...new Set([...pairs.values()].map((p) => p.auditorLogin))];
  // Tous les logins de membres de groupes audités → résolution Prénom Nom en batch.
  const memberLogins = [...new Set([...pairs.values()].flatMap((p) => p.memberLogins))];
  const [discordRows, reqRows, nameRows] = await Promise.all([
    db.select({ login: discordUsers.login, discordId: discordUsers.discordId }).from(discordUsers).where(inArray(discordUsers.login, logins)),
    db.select({ auditorLogin: auditReportRequests.auditorLogin, groupId: auditReportRequests.groupId }).from(auditReportRequests).where(inArray(auditReportRequests.auditorLogin, logins)),
    memberLogins.length > 0
      ? db.select({ login: students.login, firstName: students.first_name, lastName: students.last_name }).from(students).where(inArray(students.login, memberLogins))
      : Promise.resolve([] as { login: string; firstName: string; lastName: string }[]),
  ]);
  const discordByLogin = new Map(discordRows.map((d) => [d.login, d.discordId]));
  const alreadyRequested = new Set(reqRows.map((r) => `${r.auditorLogin}:${r.groupId}`));
  const nameByLogin = new Map<string, string>();
  for (const n of nameRows) {
    const display = [n.firstName, n.lastName].filter(Boolean).join(' ').trim();
    nameByLogin.set(n.login, display || n.login);
  }

  const out: AuditorToRequest[] = [];
  for (const [key, p] of pairs) {
    if (alreadyRequested.has(key)) continue;
    const discordId = discordByLogin.get(p.auditorLogin);
    if (!discordId) continue; // pas de Discord → on ne peut pas DM (et on ne marque pas)
    const members = p.memberLogins.map((l) => nameByLogin.get(l) ?? l).join(', ');
    out.push({ auditorLogin: p.auditorLogin, discordId, groupId: p.groupId, project: p.project, members });
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

  // N'escalader que les projets OBLIGATOIRES du tronc commun. D'anciennes
  // demandes ont pu être créées (avant ce filtre) pour des optionnels/bonus
  // (ex. make-your-game-different-maps) : on ne les relance pas.
  const mandatory = await getMandatoryProjectNames();

  const out: AuditRequestToEscalate[] = [];
  for (const r of rows) {
    if (!mandatory.has((r.projectName ?? '').toLowerCase())) continue;
    // eslint-disable-next-line no-await-in-loop
    if (await isOlderThanBusinessDays(r.requestedAt, ESCALATE_AFTER_BUSINESS_DAYS)) {
      out.push(r);
    }
  }
  return out;
}

/**
 * Résout des logins en « Prénom Nom » via la table `students` (fallback login).
 */
export async function getStudentDisplayNames(logins: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const uniq = [...new Set(logins.filter(Boolean))];
  if (uniq.length === 0) return map;
  const rows = await db
    .select({ login: students.login, firstName: students.first_name, lastName: students.last_name })
    .from(students)
    .where(inArray(students.login, uniq));
  for (const r of rows) {
    const name = [r.firstName, r.lastName].filter(Boolean).join(' ').trim();
    map.set(r.login, name || r.login);
  }
  return map;
}

/**
 * Membres d'un groupe (groupId Zone01) en « Prénom Nom » — fallback d'affichage
 * quand le context ne porte pas déjà les membres. '' si introuvable.
 */
export async function getGroupMemberNames(groupId: string): Promise<string> {
  const gid = Number(groupId);
  if (!Number.isFinite(gid)) return '';
  try {
    const data = await zone01Graphql<{ group: { members: { userLogin: string }[] }[] }>(
      `query($g: Int!){ group(where:{ id:{_eq:$g} }){ members { userLogin } } }`,
      { g: gid },
    );
    const logins = data.group?.[0]?.members?.map((m) => m.userLogin).filter(Boolean) ?? [];
    if (logins.length === 0) return '';
    const names = await getStudentDisplayNames(logins);
    return logins.map((l) => names.get(l) ?? l).join(', ');
  } catch {
    return '';
  }
}

/** Feature 7 — marque une demande comme escaladée (Teams envoyé). */
export async function markAuditEscalated(id: number): Promise<void> {
  await db
    .update(auditReportRequests)
    .set({ escalatedAt: new Date() })
    .where(eq(auditReportRequests.id, id));
}

export { SINCE_DAYS_DEFAULT, ESCALATE_AFTER_BUSINESS_DAYS };
