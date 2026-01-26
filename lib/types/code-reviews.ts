/**
 * Types partagés pour la feature Code Reviews
 *
 * Ces types sont utilisés par :
 * - Les composants UI
 * - Les API routes
 * - Les services
 */

import type { Track } from '@/lib/db/schema/audits';
import type { Zone01GroupStatus, ProjectGroup, GroupMember } from '@/lib/services/zone01';

// ============== NAVIGATION ==============

/**
 * Contexte de navigation dans le dashboard Code Reviews
 */
export interface CodeReviewContext {
    promoId: string;
    promoName?: string;
    track?: Track;
    projectName?: string;
    groupId?: string;
}

// ============== PROJETS (depuis config/projects.json) ==============

/**
 * Définition d'un projet depuis la config
 */
export interface ProjectConfig {
    id: number;
    name: string;
    project_time_week: number;
}

/**
 * Config des projets par tronc
 */
export type ProjectsConfig = Record<Track, ProjectConfig[]>;

// ============== GROUPES ENRICHIS ==============

/**
 * Résumé d'audit pour affichage rapide
 */
export interface AuditSummary {
    id: number;
    auditorName: string;
    createdAt: Date;
    hasWarnings: boolean;
    allValidated: boolean;
    validatedCount: number;
    totalCount: number;
}

/**
 * Groupe avec informations d'audit
 */
export interface ProjectGroupWithAudit extends ProjectGroup {
    audit: AuditSummary | null;
}

/**
 * Membre d'un groupe avec statut d'audit
 */
export interface GroupMemberWithAudit extends GroupMember {
    isAudited: boolean;
    validated?: boolean;
    feedback?: string;
    warnings?: string[];
}

// ============== STATISTIQUES ==============

/**
 * Stats d'audit pour un projet
 */
export interface ProjectAuditStats {
    projectName: string;
    totalGroups: number;
    finishedGroups: number;
    auditedGroups: number;
    pendingAuditGroups: number; // finished mais non audité
}

/**
 * Stats d'audit pour un tronc
 */
export interface TrackAuditStats {
    track: Track;
    promoId: string;
    totalStudents: number;
    auditedStudents: number;
    pendingStudents: number;
    projects: ProjectAuditStats[];
}

/**
 * Stats globales pour le dashboard
 */
export interface PromoAuditStats {
    promoId: string;
    promoName: string;
    totalPendingStudents: number;
    tracks: {
        track: Track;
        pendingStudents: number;
        auditProgress: number; // percentage 0-100
    }[];
}

// ============== FORMULAIRE D'AUDIT ==============

/**
 * Résultat individuel pour le formulaire
 */
export interface AuditResultInput {
    studentLogin: string;
    studentName?: string;
    validated: boolean;
    feedback: string;
    warnings: string[];
}

/**
 * Données du formulaire d'audit
 */
export interface AuditFormData {
    summary: string;
    warnings: string[];
    results: AuditResultInput[];
}

/**
 * Payload pour créer un audit (API)
 */
export interface CreateAuditPayload extends AuditFormData {
    promoId: string;
    track: Track;
    projectName: string;
    groupId: string;
}

// ============== AFFICHAGE ==============

/**
 * Étudiant dans la vue Promo + Tronc
 */
export interface StudentAuditStatus {
    login: string;
    firstName?: string;
    lastName?: string;
    isAudited: boolean;
    auditCount: number;
    lastAuditDate?: Date;
}

/**
 * Item de la liste des derniers audits
 */
export interface RecentAuditItem {
    id: number;
    promoId: string;
    track: Track;
    projectName: string;
    groupId: string;
    auditorName: string;
    createdAt: Date;
    hasWarnings: boolean;
    memberCount: number;
    validatedCount: number;
}

// ============== FILTRES ==============

/**
 * Filtres pour la liste des audits
 */
export interface AuditFilters {
    promoId?: string;
    track?: Track;
    projectName?: string;
    auditorName?: string;
    hasWarnings?: boolean;
    dateFrom?: Date;
    dateTo?: Date;
}

// ============== HELPERS ==============

/**
 * Vérifie si un groupe peut être audité
 * (uniquement si status === 'finished')
 */
export function canAuditGroup(status: Zone01GroupStatus): boolean {
    return status === 'finished';
}

/**
 * Calcule le pourcentage de progression
 */
export function calculateProgress(audited: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((audited / total) * 100);
}

/**
 * Formate un nom de tronc pour l'affichage
 */
export function formatTrackName(track: string): string {
    const trackNames: Record<string, string> = {
        'golang': 'Golang',
        'javascript': 'Javascript',
        'rust': 'Rust',
        'java': 'Java',
    };
    return trackNames[track.toLowerCase()] || track;
}

/**
 * Convertit un nom de tronc en slug URL
 */
export function trackToSlug(track: Track): string {
    return track.toLowerCase();
}

/**
 * Convertit un slug URL en nom de tronc
 */
export function slugToTrack(slug: string): Track | null {
    const mapping: Record<string, Track> = {
        'golang': 'Golang',
        'javascript': 'Javascript',
        'rust': 'Rust',
        'java': 'Java',
    };
    return mapping[slug.toLowerCase()] || null;
}
