import { db } from '@/lib/db/config';
import { auditResults, audits } from '@/lib/db/schema/audits';
import { eq, sql } from 'drizzle-orm';
import type { Track } from '@/lib/db/schema/audits';

export interface PendingGroupPriority {
  groupId: string;
  projectName: string;
  track: Track;
  members: string[];
  activeMembers: number;
  // Scores
  priorityScore: number;
  priority: 'urgent' | 'warning' | 'normal';
  // Raisons
  reasons: string[];
  // Détails
  membersNeverAudited: number;
  totalPreviousAudits: number;
  avgAuditsPerMember: number;
}

export interface PriorityEvaluationResult {
  promoId: string;
  evaluatedAt: Date;
  totalPending: number;
  urgentCount: number;
  warningCount: number;
  normalCount: number;
  groups: PendingGroupPriority[];
}

/**
 * Récupère l'historique d'audit de tous les étudiants
 * Retourne un Map<login, { auditCount, lastAuditDate, tracks }>
 */
async function getStudentAuditHistory(promoId: string): Promise<Map<string, {
  auditCount: number;
  lastAuditDate: Date | null;
  tracks: Set<string>;
  validatedCount: number;
}>> {
  const results = await db
    .select({
      studentLogin: auditResults.studentLogin,
      auditId: auditResults.auditId,
      validated: auditResults.validated,
      createdAt: auditResults.createdAt,
      track: audits.track,
    })
    .from(auditResults)
    .innerJoin(audits, eq(auditResults.auditId, audits.id))
    .where(eq(audits.promoId, promoId));

  const historyMap = new Map<string, {
    auditCount: number;
    lastAuditDate: Date | null;
    tracks: Set<string>;
    validatedCount: number;
  }>();

  for (const row of results) {
    const existing = historyMap.get(row.studentLogin);
    if (existing) {
      existing.auditCount++;
      if (row.validated) existing.validatedCount++;
      existing.tracks.add(row.track);
      if (!existing.lastAuditDate || row.createdAt > existing.lastAuditDate) {
        existing.lastAuditDate = row.createdAt;
      }
    } else {
      historyMap.set(row.studentLogin, {
        auditCount: 1,
        lastAuditDate: row.createdAt,
        tracks: new Set([row.track]),
        validatedCount: row.validated ? 1 : 0,
      });
    }
  }

  return historyMap;
}

/**
 * Calcule le score de priorité pour un groupe en attente
 * Score plus élevé = plus urgent
 */
function calculatePriorityScore(
  members: string[],
  activeMembers: number,
  track: Track,
  studentHistory: Map<string, {
    auditCount: number;
    lastAuditDate: Date | null;
    tracks: Set<string>;
    validatedCount: number;
  }>
): { score: number; reasons: string[]; membersNeverAudited: number; totalPreviousAudits: number; avgAuditsPerMember: number } {
  let score = 0;
  const reasons: string[] = [];

  // 1. Membres jamais audités (25 points par membre)
  let membersNeverAudited = 0;
  let totalPreviousAudits = 0;

  for (const login of members) {
    const history = studentHistory.get(login.toLowerCase());
    if (!history || history.auditCount === 0) {
      membersNeverAudited++;
      score += 25;
    } else {
      totalPreviousAudits += history.auditCount;
    }
  }

  if (membersNeverAudited > 0) {
    reasons.push(`${membersNeverAudited} membre(s) jamais audité(s)`);
  }

  // 2. Ratio membres jamais audités / total (jusqu'à 30 points)
  if (activeMembers > 0) {
    const neverAuditedRatio = membersNeverAudited / activeMembers;
    if (neverAuditedRatio === 1) {
      score += 30;
      reasons.push('Groupe entièrement nouveau');
    } else if (neverAuditedRatio >= 0.5) {
      score += 15;
      reasons.push('Majorité de nouveaux membres');
    }
  }

  // 3. Moyenne d'audits par membre (bonus si faible moyenne)
  const avgAuditsPerMember = activeMembers > 0 ? totalPreviousAudits / activeMembers : 0;
  if (avgAuditsPerMember < 1 && activeMembers > 0) {
    score += 20;
    reasons.push('Peu d\'audits précédents');
  } else if (avgAuditsPerMember < 2) {
    score += 10;
  }

  // 4. Bonus par track (les tracks plus avancés sont prioritaires)
  const trackBonus: Record<Track, number> = {
    'Golang': 5,      // Premier tronc
    'Javascript': 10, // Deuxième tronc
    'Rust': 15,       // Troisième tronc (spécialisation)
    'Java': 15,       // Troisième tronc (spécialisation)
  };
  score += trackBonus[track] || 0;

  // 5. Taille du groupe (groupes plus grands = plus de travail à auditer, légère priorité)
  if (activeMembers >= 3) {
    score += 5;
  }

  return {
    score,
    reasons,
    membersNeverAudited,
    totalPreviousAudits,
    avgAuditsPerMember: Math.round(avgAuditsPerMember * 10) / 10,
  };
}

/**
 * Convertit un score en niveau de priorité
 */
function scoreToPriority(score: number): 'urgent' | 'warning' | 'normal' {
  if (score >= 50) return 'urgent';
  if (score >= 25) return 'warning';
  return 'normal';
}

/**
 * Évalue la priorité de tous les groupes en attente d'une promo
 */
export async function evaluatePendingPriorities(
  promoId: string,
  pendingGroups: Array<{
    groupId: string;
    projectName: string;
    track: Track;
    members: Array<{ login: string; isDropout: boolean }>;
    activeMembers: number;
  }>
): Promise<PriorityEvaluationResult> {
  // Récupérer l'historique d'audit de tous les étudiants de la promo
  const studentHistory = await getStudentAuditHistory(promoId);

  const evaluatedGroups: PendingGroupPriority[] = [];

  for (const group of pendingGroups) {
    const activeLogins = group.members
      .filter(m => !m.isDropout)
      .map(m => m.login);

    const { score, reasons, membersNeverAudited, totalPreviousAudits, avgAuditsPerMember } =
      calculatePriorityScore(activeLogins, group.activeMembers, group.track, studentHistory);

    evaluatedGroups.push({
      groupId: group.groupId,
      projectName: group.projectName,
      track: group.track,
      members: activeLogins,
      activeMembers: group.activeMembers,
      priorityScore: score,
      priority: scoreToPriority(score),
      reasons,
      membersNeverAudited,
      totalPreviousAudits,
      avgAuditsPerMember,
    });
  }

  // Trier par score décroissant
  evaluatedGroups.sort((a, b) => b.priorityScore - a.priorityScore);

  const urgentCount = evaluatedGroups.filter(g => g.priority === 'urgent').length;
  const warningCount = evaluatedGroups.filter(g => g.priority === 'warning').length;
  const normalCount = evaluatedGroups.filter(g => g.priority === 'normal').length;

  return {
    promoId,
    evaluatedAt: new Date(),
    totalPending: pendingGroups.length,
    urgentCount,
    warningCount,
    normalCount,
    groups: evaluatedGroups,
  };
}
