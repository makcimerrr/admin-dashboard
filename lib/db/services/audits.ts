import { db } from '@/lib/db/config';
import { eq, desc, and, inArray, not } from 'drizzle-orm';
import {
  audits,
  auditResults,
  type NewAudit,
  type NewAuditResult,
  type Audit,
  type AuditWithResults,
  type Track
} from '@/lib/db/schema/audits';
import { GroupWithAuditStatus } from '../../../app/api/code-reviews/groups/route';
import promoConfig from '../../../config/promoConfig.json';

async function fetchGroupsForCodeReview(promoId: string) {
  const res = await fetch(`/api/code-reviews/groups?promoId=${promoId}`);
  if (!res.ok) throw new Error('Impossible de récupérer les groupes');
  const data = await res.json();
  return data.groups as GroupWithAuditStatus[];
}

// ============== TYPES POUR LE SERVICE ==============

export interface CreateAuditInput {
  promoId: string;
  track: Track;
  projectName: string;
  groupId: string;
  summary?: string;
  warnings?: string[];
  auditorId: number;
  auditorName: string;
  results: {
    studentLogin: string;
    validated: boolean;
    feedback?: string;
    warnings?: string[];
  }[];
}

export interface AuditStats {
  promoId: string;
  track: string;
  totalAudits: number;
  totalStudentsAudited: number;
  projectStats: {
    projectName: string;
    auditCount: number;
    groupIds: string[];
  }[];
}

// ============== LECTURE ==============

/**
 * Récupère tous les audits d'une promotion et d'un tronc
 */
export async function getAuditsByPromoAndTrack(
  promoId: string,
  track: string
): Promise<AuditWithResults[]> {
  return db.query.audits.findMany({
    where: and(eq(audits.promoId, promoId), eq(audits.track, track)),
    orderBy: [desc(audits.createdAt)],
    with: {
      results: true
    }
  });
}

/**
 * Récupère les derniers code reviews pour le dashboard
 */
export async function getRecentCodeReviews(limit: number = 5) {
  const auditsList = await db.query.audits.findMany({
    orderBy: [desc(audits.createdAt)],
    limit,
    with: {
      results: true
    }
  });

  return auditsList.map((audit) => {
    const promo = (promoConfig as any[]).find(
      (p) => String(p.eventId) === String(audit.promoId)
    );
    const promotionName = promo?.key ?? `Promotion ${audit.promoId}`;

    return {
      id: audit.id,
      projectName: audit.projectName,
      groupName: audit.groupId,
      groupMembers: audit.results.map((r) => r.studentLogin),
      promotionName,
      reviewedAt: audit.createdAt,
      status: (audit.warnings?.length ?? 0) > 0 ? 'WARNING' : 'OK',
      promoId: audit.promoId
    };
  });
}

/**
 * Récupère les code reviews urgents :
 * - groupes avec warnings
 * - groupes jamais audités (source Zone01)
 */
export async function getUrgentCodeReviews(
  promoId?: string,
  projectName?: string,
  limit: number = 5
) {
  // 1) Audits existants avec warnings
  const auditsWithWarnings = await db.query.audits.findMany({
    where: not(eq(audits.warnings, [])),
    orderBy: [desc(audits.createdAt)]
  });

  const urgentFromWarnings = auditsWithWarnings.map((audit) => ({
    id: `audit-${audit.id}`,
    groupName: audit.groupId,
    promotion: audit.promoId,
    reason: 'Warnings détectés',
    level: 'URGENT'
  }));

  // 2) Groupes jamais audités (Zone01 = source of truth)
  let urgentNeverAudited: {
    id: string;
    groupName: string;
    promotion: string;
    reason: string;
    level: 'URGENT';
  }[] = [];

  if (promoId && projectName) {
    const zone01Groups = await fetchGroupsForCodeReview(promoId);

    const auditedGroupIds = await getAuditedGroupIds(promoId, projectName);

    urgentNeverAudited = zone01Groups
      .filter((group) => !auditedGroupIds.includes(group.groupId))
      .map((group) => ({
        id: `zone01-${group.groupId}`,
        groupName: group.groupId,
        promotion: promoId,
        reason: 'Jamais audité',
        level: 'URGENT'
      }));
  }

  return [...urgentNeverAudited, ...urgentFromWarnings].slice(0, limit);
}

/**
 * Récupère un audit par son ID avec tous les résultats
 */
export async function getAuditById(
  id: number
): Promise<AuditWithResults | undefined> {
  return db.query.audits.findFirst({
    where: eq(audits.id, id),
    with: {
      results: true
    }
  });
}

/**
 * Récupère l'audit d'un groupe spécifique (s'il existe)
 * Retourne undefined si le groupe n'a pas encore été audité
 */
export async function getAuditByGroup(
  promoId: string,
  projectName: string,
  groupId: string
): Promise<AuditWithResults | undefined> {
  return db.query.audits.findFirst({
    where: and(
      eq(audits.promoId, promoId),
      eq(audits.projectName, projectName),
      eq(audits.groupId, groupId)
    ),
    with: {
      results: true
    }
  });
}

/**
 * Récupère les derniers audits (pour le widget dashboard)
 */
export async function getRecentAudits(limit: number = 10): Promise<Audit[]> {
  return db.query.audits.findMany({
    orderBy: [desc(audits.createdAt)],
    limit
  });
}

/**
 * Récupère les derniers audits avec résultats
 */
export async function getRecentAuditsWithResults(
  limit: number = 10
): Promise<AuditWithResults[]> {
  return db.query.audits.findMany({
    orderBy: [desc(audits.createdAt)],
    limit,
    with: {
      results: true
    }
  });
}

/**
 * Récupère tous les audits d'un projet spécifique
 */
export async function getAuditsByProject(
  promoId: string,
  projectName: string
): Promise<AuditWithResults[]> {
  return db.query.audits.findMany({
    where: and(
      eq(audits.promoId, promoId),
      eq(audits.projectName, projectName)
    ),
    orderBy: [desc(audits.createdAt)],
    with: {
      results: true
    }
  });
}

/**
 * Récupère les groupIds déjà audités pour un projet
 */
export async function getAuditedGroupIds(
  promoId: string,
  projectName: string
): Promise<string[]> {
  const result = await db
    .select({ groupId: audits.groupId })
    .from(audits)
    .where(
      and(eq(audits.promoId, promoId), eq(audits.projectName, projectName))
    );

  return result.map((r) => r.groupId);
}

/**
 * Récupère les logins des étudiants audités pour une promo/tronc
 * Retourne un Map<groupId, Set<studentLogin>>
 */
export async function getAuditedStudentsByPromoAndTrack(
  promoId: string,
  track: string
): Promise<Map<string, Set<string>>> {
  const auditsWithResults = await db.query.audits.findMany({
    where: and(eq(audits.promoId, promoId), eq(audits.track, track)),
    with: {
      results: true
    }
  });

  const map = new Map<string, Set<string>>();
  for (const audit of auditsWithResults) {
    const logins = new Set<string>();
    for (const result of audit.results) {
      logins.add(result.studentLogin);
    }
    map.set(audit.groupId, logins);
  }

  return map;
}

// ============== CRÉATION ==============

/**
 * Crée un nouvel audit avec ses résultats individuels
 * Utilise une transaction pour garantir l'intégrité
 */
export async function createAudit(
  data: CreateAuditInput
): Promise<AuditWithResults> {
  return db.transaction(async (tx) => {
    // Créer l'audit principal
    const [audit] = await tx
      .insert(audits)
      .values({
        promoId: data.promoId,
        track: data.track,
        projectName: data.projectName,
        groupId: data.groupId,
        summary: data.summary,
        warnings: data.warnings || [],
        auditorId: data.auditorId,
        auditorName: data.auditorName
      })
      .returning();

    // Créer les résultats individuels
    const resultsData: NewAuditResult[] = data.results.map((r) => ({
      auditId: audit.id,
      studentLogin: r.studentLogin,
      validated: r.validated,
      feedback: r.feedback,
      warnings: r.warnings || []
    }));

    let results: (typeof auditResults.$inferSelect)[] = [];
    if (resultsData.length > 0) {
      results = await tx.insert(auditResults).values(resultsData).returning();
    }

    return {
      ...audit,
      results
    };
  });
}

// ============== MISE À JOUR ==============

/**
 * Met à jour un audit existant et ses résultats
 */
export async function updateAudit(
  id: number,
  data: Partial<Pick<NewAudit, 'summary' | 'warnings'>> & {
    results?: {
      studentLogin: string;
      validated: boolean;
      feedback?: string;
      warnings?: string[];
    }[];
  }
): Promise<AuditWithResults | undefined> {
  return db.transaction(async (tx) => {
    // Mettre à jour l'audit
    const [updatedAudit] = await tx
      .update(audits)
      .set({
        summary: data.summary,
        warnings: data.warnings,
        updatedAt: new Date()
      })
      .where(eq(audits.id, id))
      .returning();

    if (!updatedAudit) {
      return undefined;
    }

    // Si des résultats sont fournis, les mettre à jour
    if (data.results) {
      // Supprimer les anciens résultats
      await tx.delete(auditResults).where(eq(auditResults.auditId, id));

      // Insérer les nouveaux
      const resultsData: NewAuditResult[] = data.results.map((r) => ({
        auditId: id,
        studentLogin: r.studentLogin,
        validated: r.validated,
        feedback: r.feedback,
        warnings: r.warnings || []
      }));

      if (resultsData.length > 0) {
        await tx.insert(auditResults).values(resultsData);
      }
    }

    // Récupérer l'audit avec ses résultats mis à jour
    return db.query.audits.findFirst({
      where: eq(audits.id, id),
      with: {
        results: true
      }
    });
  });
}

// ============== SUPPRESSION ==============

/**
 * Supprime un audit et ses résultats (cascade)
 */
export async function deleteAudit(id: number): Promise<boolean> {
  const result = await db.delete(audits).where(eq(audits.id, id)).returning();
  return result.length > 0;
}

// ============== STATISTIQUES ==============

/**
 * Calcule les statistiques d'audit pour une promotion
 */
export async function getAuditStatsForPromo(
  promoId: string
): Promise<AuditStats[]> {
  const allAudits = await db.query.audits.findMany({
    where: eq(audits.promoId, promoId),
    with: {
      results: true
    }
  });

  // Grouper par tronc
  const statsByTrack = new Map<string, AuditStats>();

  for (const audit of allAudits) {
    let stats = statsByTrack.get(audit.track);
    if (!stats) {
      stats = {
        promoId,
        track: audit.track,
        totalAudits: 0,
        totalStudentsAudited: 0,
        projectStats: []
      };
      statsByTrack.set(audit.track, stats);
    }

    stats.totalAudits++;
    stats.totalStudentsAudited += audit.results.length;

    // Statistiques par projet
    let projectStat = stats.projectStats.find(
      (p) => p.projectName === audit.projectName
    );
    if (!projectStat) {
      projectStat = {
        projectName: audit.projectName,
        auditCount: 0,
        groupIds: []
      };
      stats.projectStats.push(projectStat);
    }
    projectStat.auditCount++;
    projectStat.groupIds.push(audit.groupId);
  }

  return Array.from(statsByTrack.values());
}

/**
 * Vérifie si un étudiant a été audité au moins une fois sur un tronc
 */
export async function hasStudentBeenAudited(
  promoId: string,
  track: string,
  studentLogin: string
): Promise<boolean> {
  const result = await db.query.auditResults.findFirst({
    where: eq(auditResults.studentLogin, studentLogin),
    with: {
      audit: true
    }
  });

  if (!result) return false;

  return result.audit.promoId === promoId && result.audit.track === track;
}

/**
 * Compte le nombre d'audits par auditeur
 */
export async function getAuditCountByAuditor(
  promoId?: string
): Promise<{ auditorId: number | null; auditorName: string; count: number }[]> {
  const whereClause = promoId ? eq(audits.promoId, promoId) : undefined;

  const allAudits = await db.query.audits.findMany({
    where: whereClause
  });

  const countMap = new Map<
    string,
    { auditorId: number | null; auditorName: string; count: number }
  >();

  for (const audit of allAudits) {
    const key = audit.auditorName;
    const existing = countMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      countMap.set(key, {
        auditorId: audit.auditorId,
        auditorName: audit.auditorName,
        count: 1
      });
    }
  }

  return Array.from(countMap.values()).sort((a, b) => b.count - a.count);
}
