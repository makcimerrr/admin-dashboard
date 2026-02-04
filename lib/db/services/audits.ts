import { db } from '@/lib/db/config';
import { eq, desc, and, inArray, not, sql, or, isNull, gt, lt } from 'drizzle-orm';
import {
  audits,
  auditResults,
  type NewAudit,
  type NewAuditResult,
  type Audit,
  type AuditWithResults,
  type Track,
  type Priority
} from '@/lib/db/schema/audits';
import { GroupWithAuditStatus } from '../../../app/api/code-reviews/groups/route';
import promoConfig from '../../../config/promoConfig.json';

async function fetchGroupsForCodeReview(promoId: string) {
  const res = await fetch(`/api/code-reviews/groups?promoId=${promoId}`);
  if (!res.ok) throw new Error('Impossible de récupérer les groupes');
  const data = await res.json();
  return data.groups as GroupWithAuditStatus[];
}

// ============== HELPERS ==============

/**
 * Helper to safely get warnings count from JSONB field
 * Handles: arrays, JSON strings, null, undefined
 */
function getWarningsArray(warnings: unknown): string[] {
  if (Array.isArray(warnings)) {
    return warnings;
  }
  if (typeof warnings === 'string') {
    try {
      const parsed = JSON.parse(warnings);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Not valid JSON, return empty
    }
  }
  return [];
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
    absent?: boolean;
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
 * Types pour les données enrichies des widgets
 */
export interface RecentReviewData {
  id: number;
  projectName: string;
  groupId: string;
  groupMembers: string[];
  promotionName: string;
  promoId: string;
  track: string;
  reviewedAt: Date;
  auditorName: string;
  // Statuts
  status: 'OK' | 'WARNING' | 'CRITICAL';
  priority: Priority;
  hasWarnings: boolean;
  warningsCount: number;
  // Validation
  validatedCount: number;
  totalMembers: number;
  validationRate: number;
  // Warnings détaillés
  globalWarnings: string[];
  memberWarnings: { login: string; warnings: string[] }[];
}

export interface UrgentReviewData {
  id: string;
  type: 'audit_warning' | 'low_validation' | 'pending_old' | 'pending_recent';
  groupId: string;
  projectName: string;
  promoId: string;
  promotionName: string;
  track: string;
  reason: string;
  reasonDetail?: string;
  priority: 'urgent' | 'warning' | 'info';
  // Pour les audits existants
  auditId?: number;
  validationRate?: number;
  warningsCount?: number;
  auditorName?: string;
  auditDate?: Date;
  // Pour les groupes non audités
  daysPending?: number;
  membersCount?: number;
}

/**
 * Récupère les derniers code reviews pour le dashboard (version enrichie)
 */
export async function getRecentCodeReviews(limit: number = 5): Promise<RecentReviewData[]> {
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

    const globalWarnings = getWarningsArray(audit.warnings);
    const memberWarnings = audit.results
      .filter((r) => getWarningsArray(r.warnings).length > 0)
      .map((r) => ({ login: r.studentLogin, warnings: getWarningsArray(r.warnings) }));

    const totalWarnings = globalWarnings.length + memberWarnings.reduce((sum, m) => sum + m.warnings.length, 0);
    const validatedCount = audit.results.filter((r) => r.validated).length;
    const totalMembers = audit.results.length;
    const validationRate = totalMembers > 0 ? Math.round((validatedCount / totalMembers) * 100) : 0;

    // Déterminer le statut
    let status: 'OK' | 'WARNING' | 'CRITICAL' = 'OK';
    if (totalWarnings > 0 || validationRate < 50) {
      status = validationRate < 30 || totalWarnings > 2 ? 'CRITICAL' : 'WARNING';
    }

    // Déterminer la priorité
    let priority: Priority = audit.priority as Priority || 'normal';
    if (status === 'CRITICAL') priority = 'urgent';
    else if (status === 'WARNING') priority = 'warning';

    return {
      id: audit.id,
      projectName: audit.projectName,
      groupId: audit.groupId,
      groupMembers: audit.results.map((r) => r.studentLogin),
      promotionName,
      promoId: audit.promoId,
      track: audit.track,
      reviewedAt: audit.createdAt,
      auditorName: audit.auditorName,
      status,
      priority,
      hasWarnings: totalWarnings > 0,
      warningsCount: totalWarnings,
      validatedCount,
      totalMembers,
      validationRate,
      globalWarnings,
      memberWarnings
    };
  });
}

/**
 * Récupère les code reviews urgents avec une logique métier améliorée
 * Critères d'urgence :
 * 1. Audits avec warnings (priority: urgent)
 * 2. Audits avec faible taux de validation < 50% (priority: warning)
 * 3. Groupes finished non audités depuis > 7 jours (priority: urgent)
 * 4. Groupes finished non audités récents (priority: info)
 */
export async function getUrgentCodeReviews(
  promoId?: string,
  projectName?: string,
  limit: number = 10
): Promise<UrgentReviewData[]> {
  const urgentItems: UrgentReviewData[] = [];

  // Récupérer tous les audits et filtrer côté JavaScript pour éviter les erreurs SQL
  const allAudits = await db.query.audits.findMany({
    where: promoId ? eq(audits.promoId, promoId) : undefined,
    orderBy: [desc(audits.createdAt)],
    with: { results: true }
  });

  for (const audit of allAudits) {
    const promo = (promoConfig as any[]).find((p) => String(p.eventId) === String(audit.promoId));
    const validatedCount = audit.results.filter((r) => r.validated).length;
    const totalMembers = audit.results.length;
    const validationRate = totalMembers > 0 ? Math.round((validatedCount / totalMembers) * 100) : 100;

    // Calculer les warnings de manière sécurisée (gère arrays, JSON strings, null)
    const globalWarningsArr = getWarningsArray(audit.warnings);
    const memberWarningsCount = audit.results.reduce((sum, r) => {
      return sum + getWarningsArray(r.warnings).length;
    }, 0);
    const totalWarnings = globalWarningsArr.length + memberWarningsCount;

    // 1) Audits avec warnings
    if (totalWarnings > 0) {
      urgentItems.push({
        id: `warning-${audit.id}`,
        type: 'audit_warning',
        groupId: audit.groupId,
        projectName: audit.projectName,
        promoId: audit.promoId,
        promotionName: promo?.key ?? `Promotion ${audit.promoId}`,
        track: audit.track,
        reason: 'Warnings détectés',
        reasonDetail: `${totalWarnings} warning(s)`,
        priority: 'urgent',
        auditId: audit.id,
        validationRate,
        warningsCount: totalWarnings,
        auditorName: audit.auditorName,
        auditDate: audit.createdAt
      });
      continue;
    }

    // 2) Audits avec faible taux de validation (< 50%)
    if (validationRate < 50 && totalMembers > 0) {
      urgentItems.push({
        id: `lowval-${audit.id}`,
        type: 'low_validation',
        groupId: audit.groupId,
        projectName: audit.projectName,
        promoId: audit.promoId,
        promotionName: promo?.key ?? `Promotion ${audit.promoId}`,
        track: audit.track,
        reason: 'Faible taux de validation',
        reasonDetail: `${validatedCount}/${totalMembers} validé(s) (${validationRate}%)`,
        priority: validationRate < 30 ? 'urgent' : 'warning',
        auditId: audit.id,
        validationRate,
        warningsCount: 0,
        auditorName: audit.auditorName,
        auditDate: audit.createdAt
      });
    }
  }

  // Tri par priorité (urgent > warning > info)
  const priorityOrder = { urgent: 0, warning: 1, info: 2 };
  urgentItems.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return urgentItems.slice(0, limit);
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
      logins.add(result.studentLogin.toLowerCase());
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
    // Calculer les stats de validation
    const validatedCount = data.results.filter((r) => r.validated).length;
    const totalMembers = data.results.length;
    const validationRate = totalMembers > 0 ? (validatedCount / totalMembers) * 100 : 100;
    const warningsCount = (data.warnings?.length || 0) + data.results.reduce((sum, r) => sum + (r.warnings?.length || 0), 0);

    // Déterminer la priorité automatiquement
    let priority: Priority = 'normal';
    if (warningsCount > 0 || validationRate < 30) {
      priority = 'urgent';
    } else if (validationRate < 50) {
      priority = 'warning';
    }

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
        auditorName: data.auditorName,
        priority,
        validatedCount,
        totalMembers
      })
      .returning();

    // Créer les résultats individuels
    const resultsData: NewAuditResult[] = data.results.map((r) => ({
      auditId: audit.id,
      studentLogin: r.studentLogin,
      validated: r.validated,
      absent: r.absent || false,
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
  data: Partial<Pick<NewAudit, 'summary' | 'warnings' | 'priority'>> & {
    results?: {
      studentLogin: string;
      validated: boolean;
      absent?: boolean;
      feedback?: string;
      warnings?: string[];
    }[];
  }
): Promise<AuditWithResults | undefined> {
  return db.transaction(async (tx) => {
    // Calculer les nouvelles stats si des résultats sont fournis
    let validatedCount: number | undefined;
    let totalMembers: number | undefined;
    let priority: Priority | undefined = data.priority as Priority;

    if (data.results) {
      validatedCount = data.results.filter((r) => r.validated).length;
      totalMembers = data.results.length;
      const validationRate = totalMembers > 0 ? (validatedCount / totalMembers) * 100 : 100;
      const warningsCount = (data.warnings?.length || 0) + data.results.reduce((sum, r) => sum + (r.warnings?.length || 0), 0);

      // Recalculer la priorité si pas définie explicitement
      if (!priority) {
        if (warningsCount > 0 || validationRate < 30) {
          priority = 'urgent';
        } else if (validationRate < 50) {
          priority = 'warning';
        } else {
          priority = 'normal';
        }
      }
    }

    // Mettre à jour l'audit
    const [updatedAudit] = await tx
      .update(audits)
      .set({
        summary: data.summary,
        warnings: data.warnings,
        priority,
        validatedCount,
        totalMembers,
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
        absent: r.absent || false,
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

/**
 * Type pour les audits d'un étudiant
 */
export interface StudentAuditData {
  auditId: number;
  projectName: string;
  track: string;
  promoId: string;
  promoName: string;
  groupId: string;
  auditorName: string;
  auditDate: Date;
  validated: boolean;
  absent: boolean;
  feedback: string | null;
  warnings: string[];
  globalSummary: string | null;
  globalWarnings: string[];
  priority: Priority;
}

/**
 * Récupère tous les audits d'un étudiant par son login
 */
export async function getAuditsByStudentLogin(
  studentLogin: string
): Promise<StudentAuditData[]> {
  // Récupérer tous les audit_results pour cet étudiant
  const studentResults = await db.query.auditResults.findMany({
    where: eq(auditResults.studentLogin, studentLogin),
    with: {
      audit: true
    },
    orderBy: [desc(auditResults.createdAt)]
  });

  return studentResults.map((result) => {
    const audit = result.audit;
    const promo = (promoConfig as any[]).find(
      (p) => String(p.eventId) === String(audit.promoId)
    );

    return {
      auditId: audit.id,
      projectName: audit.projectName,
      track: audit.track,
      promoId: audit.promoId,
      promoName: promo?.key ?? `Promotion ${audit.promoId}`,
      groupId: audit.groupId,
      auditorName: audit.auditorName,
      auditDate: audit.createdAt,
      validated: result.validated,
      absent: result.absent,
      feedback: result.feedback,
      warnings: getWarningsArray(result.warnings),
      globalSummary: audit.summary,
      globalWarnings: getWarningsArray(audit.warnings),
      priority: audit.priority as Priority || 'normal'
    };
  });
}
