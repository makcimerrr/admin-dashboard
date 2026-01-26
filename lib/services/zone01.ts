/**
 * Client API Zone01
 *
 * Ce module gère la communication avec l'API externe Zone01 qui est la source
 * de vérité pour les données étudiants, projets et groupes.
 *
 * Endpoint principal : GET /api/v1/promotions/[promoID]/students
 */

const ZONE01_API_BASE = 'https://api-zone01-rouen.deno.dev/api/v1';

// ============== TYPES API ZONE01 ==============

/**
 * Structure brute retournée par l'API Zone01
 */
export interface Zone01ApiResponse {
    progress: Zone01ProgressEntry[];
}

/**
 * Entrée de progression d'un étudiant sur un projet
 */
export interface Zone01ProgressEntry {
    user: {
        login: string;
        firstName?: string;
        lastName?: string;
    };
    object: {
        name: string;
    };
    group: {
        id: number;
        status: Zone01GroupStatus;
    };
    grade?: number | null;
}

/**
 * Statuts possibles d'un groupe (projet)
 */
export type Zone01GroupStatus = 'finished' | 'in_progress' | 'setup' | 'failed' | 'without group';

// ============== TYPES NORMALISÉS ==============

/**
 * Membre d'un groupe (étudiant)
 */
export interface GroupMember {
    login: string;
    firstName?: string;
    lastName?: string;
    grade: number | null;
}

/**
 * Groupe reconstitué à partir des données API
 */
export interface ProjectGroup {
    groupId: string;
    projectName: string;
    status: Zone01GroupStatus;
    members: GroupMember[];
}

/**
 * Étudiant avec ses projets
 */
export interface StudentWithProjects {
    login: string;
    firstName?: string;
    lastName?: string;
    projects: {
        name: string;
        groupId: string;
        status: Zone01GroupStatus;
        grade: number | null;
    }[];
}

// ============== CACHE ==============

// Cache simple en mémoire pour éviter les appels répétés
// En production, utiliser un cache Redis ou similar
const cache = new Map<string, { data: Zone01ProgressEntry[]; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCacheKey(promoId: string): string {
    return `zone01:promo:${promoId}`;
}

function getFromCache(promoId: string): Zone01ProgressEntry[] | null {
    const key = getCacheKey(promoId);
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.data;
    }
    cache.delete(key);
    return null;
}

function setCache(promoId: string, data: Zone01ProgressEntry[]): void {
    cache.set(getCacheKey(promoId), { data, timestamp: Date.now() });
}

export function clearCache(promoId?: string): void {
    if (promoId) {
        cache.delete(getCacheKey(promoId));
    } else {
        cache.clear();
    }
}

// ============== API CLIENT ==============

/**
 * Récupère les progressions d'une promotion depuis l'API Zone01
 */
export async function fetchPromotionProgressions(promoId: string): Promise<Zone01ProgressEntry[]> {
    // Vérifier le cache
    const cached = getFromCache(promoId);
    if (cached) {
        return cached;
    }

    const url = `${ZONE01_API_BASE}/promotions/${encodeURIComponent(promoId)}/students`;

    const response = await fetch(url, {
        headers: {
            'Accept': 'application/json',
        },
        next: { revalidate: 300 }, // Cache Next.js 5 min
    });

    if (!response.ok) {
        throw new Error(`Zone01 API error: ${response.status} ${response.statusText}`);
    }

    const data: Zone01ApiResponse = await response.json();
    const progressions = data.progress || [];

    // Mettre en cache
    setCache(promoId, progressions);

    return progressions;
}

// ============== FONCTIONS DE NORMALISATION ==============

/**
 * Reconstitue les groupes d'un projet à partir des progressions
 *
 * Les groupes sont spécifiques à chaque projet :
 * - Un étudiant peut être dans des groupes différents selon les projets
 * - Les tailles de groupe sont variables
 */
export function buildProjectGroups(
    progressions: Zone01ProgressEntry[],
    projectName: string
): ProjectGroup[] {
    const groupsMap = new Map<string, ProjectGroup>();
    const projectNameLower = projectName.toLowerCase();

    for (const prog of progressions) {
        // Case-insensitive comparison for project names
        if (prog.object.name.toLowerCase() !== projectNameLower) continue;

        // Convert numeric groupId to string for storage/comparison
        const groupId = String(prog.group.id);
        let group = groupsMap.get(groupId);

        if (!group) {
            group = {
                groupId,
                projectName: prog.object.name,
                status: prog.group.status,
                members: [],
            };
            groupsMap.set(groupId, group);
        }

        group.members.push({
            login: prog.user.login,
            firstName: prog.user.firstName,
            lastName: prog.user.lastName,
            grade: prog.grade ?? null,
        });
    }

    return Array.from(groupsMap.values());
}

/**
 * Reconstitue tous les groupes de tous les projets d'un tronc
 */
export function buildAllGroupsForTrack(
    progressions: Zone01ProgressEntry[],
    trackProjects: string[]
): Map<string, ProjectGroup[]> {
    const result = new Map<string, ProjectGroup[]>();

    for (const projectName of trackProjects) {
        const groups = buildProjectGroups(progressions, projectName);
        if (groups.length > 0) {
            result.set(projectName, groups);
        }
    }

    return result;
}

/**
 * Récupère la liste des étudiants uniques d'une promotion
 */
export function getUniqueStudents(progressions: Zone01ProgressEntry[]): StudentWithProjects[] {
    const studentsMap = new Map<string, StudentWithProjects>();

    for (const prog of progressions) {
        const login = prog.user.login;
        let student = studentsMap.get(login);

        if (!student) {
            student = {
                login,
                firstName: prog.user.firstName,
                lastName: prog.user.lastName,
                projects: [],
            };
            studentsMap.set(login, student);
        }

        student.projects.push({
            name: prog.object.name,
            groupId: String(prog.group.id),
            status: prog.group.status,
            grade: prog.grade ?? null,
        });
    }

    return Array.from(studentsMap.values());
}

/**
 * Filtre les progressions pour un tronc donné
 */
export function filterProgressionsByTrack(
    progressions: Zone01ProgressEntry[],
    trackProjects: string[]
): Zone01ProgressEntry[] {
    // Case-insensitive matching for project names
    const projectSet = new Set(trackProjects.map(p => p.toLowerCase()));
    return progressions.filter(p => projectSet.has(p.object.name.toLowerCase()));
}

/**
 * Identifie les étudiants qui n'ont reçu aucun audit sur un tronc
 *
 * @param progressions - Données de l'API Zone01
 * @param trackProjects - Liste des noms de projets du tronc
 * @param auditedStudents - Map<groupId, Set<studentLogin>> des étudiants déjà audités
 * @returns Liste des logins des étudiants non audités
 */
export function getUnauditedStudents(
    progressions: Zone01ProgressEntry[],
    trackProjects: string[],
    auditedStudents: Map<string, Set<string>>
): string[] {
    // Case-insensitive matching for project names
    const projectSet = new Set(trackProjects.map(p => p.toLowerCase()));
    const studentAuditStatus = new Map<string, boolean>();

    for (const prog of progressions) {
        if (!projectSet.has(prog.object.name.toLowerCase())) continue;

        const login = prog.user.login;

        // Initialiser à false si pas encore vu
        if (!studentAuditStatus.has(login)) {
            studentAuditStatus.set(login, false);
        }

        // Vérifier si l'étudiant a été audité dans ce groupe
        const auditedLogins = auditedStudents.get(String(prog.group.id));
        if (auditedLogins?.has(login)) {
            studentAuditStatus.set(login, true);
        }
    }

    // Retourner les logins non audités
    return Array.from(studentAuditStatus.entries())
        .filter(([_, audited]) => !audited)
        .map(([login]) => login);
}

/**
 * Compte les groupes par statut pour un projet
 */
export function countGroupsByStatus(
    progressions: Zone01ProgressEntry[],
    projectName: string
): Record<Zone01GroupStatus, number> {
    const groups = buildProjectGroups(progressions, projectName);
    const counts: Record<Zone01GroupStatus, number> = {
        'finished': 0,
        'in_progress': 0,
        'setup': 0,
        'failed': 0,
        'without group': 0,
    };

    for (const group of groups) {
        counts[group.status]++;
    }

    return counts;
}

/**
 * Récupère les statistiques d'un tronc
 */
export interface TrackStats {
    track: string;
    totalStudents: number;
    projects: {
        name: string;
        totalGroups: number;
        finishedGroups: number;
        inProgressGroups: number;
    }[];
}

export function getTrackStats(
    progressions: Zone01ProgressEntry[],
    track: string,
    trackProjects: string[]
): TrackStats {
    const filteredProgressions = filterProgressionsByTrack(progressions, trackProjects);
    const uniqueStudents = new Set(filteredProgressions.map(p => p.user.login));

    const projects = trackProjects.map(projectName => {
        const groups = buildProjectGroups(progressions, projectName);
        return {
            name: projectName,
            totalGroups: groups.length,
            finishedGroups: groups.filter(g => g.status === 'finished').length,
            inProgressGroups: groups.filter(g => g.status === 'in_progress').length,
        };
    });

    return {
        track,
        totalStudents: uniqueStudents.size,
        projects,
    };
}
