/**
 * Service d'import des audits depuis un fichier CSV
 *
 * Format CSV attendu:
 * Nom,Commentaire,Date,Date de création,Effectuée par,Groupe,Projet,Promotion
 *
 * IMPORTANT: Cette version matche les étudiants aux vrais groupes Zone01
 */

import { parse } from 'date-fns';
import { fr } from 'date-fns/locale';
import { eq, like } from 'drizzle-orm';
import { db } from '@/lib/db/config';
import { audits, auditResults } from '@/lib/db/schema/audits';
import { getTrackByProjectName } from '@/lib/config/projects';
import { fetchPromotionProgressions, buildProjectGroups, type ProjectGroup } from '@/lib/services/zone01';
import type { Track } from '@/lib/db/schema/audits';

// Mapping des promotions CSV vers les eventIds
const PROMO_MAPPING: Record<string, string> = {
    'Promo 2022 P1': '32',
    'Promo 2023 P1': '148',
    'Promo 2023 P2': '216',
    'Promo 2024 P1': '303',
    'Promo 2025 P1': '526',
    'Promo 2025 P2': '904',
    // Formats alternatifs
    'P1 2022': '32',
    'P1 2023': '148',
    'P2 2023': '216',
    'P1 2024': '303',
    'P1 2025': '526',
    'P2 2025': '904',
};

// Normalisation des noms de projets
const PROJECT_NAME_NORMALIZATION: Record<string, string> = {
    'go-reloaded': 'Go-reloaded',
    'go reloaded': 'Go-reloaded',
    'ascii-art': 'Ascii-art',
    'ascii-art-web': 'Ascii-art-web',
    'ascii art web': 'Ascii-art-web',
    'groupie-tracker': 'Groupie-tracker',
    'lem-in': 'Lem-in',
    'forum': 'Forum',
    'make-your-game': 'Make-your-game',
    'real-time-forum': 'Real-time-forum',
    'graphql': 'Graphql',
    'social-network': 'Social-network',
    'mini-framework': 'Mini-framework',
    'bomberman-dom': 'Bomberman-dom',
    'smart-road': 'Smart-road',
    'filler': 'Filler',
    'rt': 'RT',
    'multiplayer-fps': 'Multiplayer-fps',
    '0-shell': '0-shell',
    'lets-play': 'Lets-Play',
    'angul-it': 'Angul-It',
    'buy-01': 'Buy-01',
    'mr-jenk': 'MR-Jenk',
    'safe-zone': 'Safe-Zone',
    'buy-02': 'Buy-02',
    'nexus': 'Nexus',
    'neo-4-flix': 'Neo-4-Flix',
    'travel-plan': 'Travel-Plan',
    'lets-travel': 'Lets-Travel',
};

export interface CsvAuditRow {
    Nom: string;
    Commentaire: string;
    Date: string;
    'Date de création': string;
    'Effectuée par': string;
    Groupe: string;
    Projet: string;
    Promotion: string;
}

export interface ImportResult {
    total: number;
    imported: number;
    skipped: number;
    errors: string[];
    details: {
        matched: { row: number; groupId: string; logins: string[] }[];
        unmatched: { row: number; logins: string[]; reason: string }[];
    };
}

/**
 * Extrait les logins des étudiants depuis le champ Groupe
 * Format: "login1 (https://...), login2 (https://...)"
 */
function extractLogins(groupField: string): string[] {
    if (!groupField) return [];

    const logins: string[] = [];
    // Pattern: login (https://...)
    const regex = /([a-zA-Z0-9_-]+)\s*\(https?:\/\/[^)]+\)/g;
    let match;

    while ((match = regex.exec(groupField)) !== null) {
        logins.push(match[1].toLowerCase());
    }

    return logins;
}

/**
 * Parse une date française "8 avril 2024" en Date
 */
function parseFrenchDate(dateStr: string): Date | null {
    if (!dateStr || dateStr.trim() === '') return null;

    try {
        const cleanDate = dateStr.trim();

        const formats = [
            'd MMMM yyyy',
            'd MMMM yyyy HH:mm',
            'dd MMMM yyyy',
            'dd MMMM yyyy HH:mm',
        ];

        for (const format of formats) {
            try {
                const parsed = parse(cleanDate, format, new Date(), { locale: fr });
                if (!isNaN(parsed.getTime())) {
                    return parsed;
                }
            } catch {
                continue;
            }
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * Normalise un nom de projet
 */
function normalizeProjectName(projectName: string): string {
    const lower = projectName.toLowerCase().trim();
    return PROJECT_NAME_NORMALIZATION[lower] || projectName.trim();
}

/**
 * Extrait la première promotion valide depuis le champ Promotion
 */
function extractPromoId(promotionField: string): string | null {
    if (!promotionField) return null;

    const promos = promotionField.split(',').map(p => p.trim());

    for (const promo of promos) {
        if (promo.toLowerCase().includes('green it')) continue;

        if (PROMO_MAPPING[promo]) {
            return PROMO_MAPPING[promo];
        }

        const match = promo.match(/Promo\s+(\d{4})\s+P(\d)/i);
        if (match) {
            const key = `P${match[2]} ${match[1]}`;
            if (PROMO_MAPPING[key]) {
                return PROMO_MAPPING[key];
            }
        }
    }

    return null;
}

/**
 * Trouve le groupe Zone01 qui correspond aux logins donnés
 *
 * Stratégie de matching:
 * 1. Match exact: tous les logins du CSV sont dans le groupe et vice-versa
 * 2. Match partiel: au moins 50% des logins du CSV sont dans le groupe
 */
function findMatchingGroup(
    logins: string[],
    groups: ProjectGroup[]
): ProjectGroup | null {
    const loginsSet = new Set(logins.map(l => l.toLowerCase()));

    // 1. Essayer un match exact
    for (const group of groups) {
        const groupLogins = new Set(group.members.map(m => m.login.toLowerCase()));

        // Match exact: mêmes logins
        if (loginsSet.size === groupLogins.size) {
            let allMatch = true;
            for (const login of loginsSet) {
                if (!groupLogins.has(login)) {
                    allMatch = false;
                    break;
                }
            }
            if (allMatch) {
                return group;
            }
        }
    }

    // 2. Essayer un match partiel (au moins 50% des logins du CSV sont dans le groupe)
    let bestMatch: ProjectGroup | null = null;
    let bestScore = 0;

    for (const group of groups) {
        const groupLogins = new Set(group.members.map(m => m.login.toLowerCase()));

        let matchCount = 0;
        for (const login of loginsSet) {
            if (groupLogins.has(login)) {
                matchCount++;
            }
        }

        const score = matchCount / loginsSet.size;
        if (score >= 0.5 && score > bestScore) {
            bestScore = score;
            bestMatch = group;
        }
    }

    return bestMatch;
}

// Cache des progressions Zone01 par promo
const progressionCache = new Map<string, ProjectGroup[]>();

/**
 * Récupère les groupes d'un projet depuis Zone01 (avec cache)
 */
async function getProjectGroups(promoId: string, projectName: string): Promise<ProjectGroup[]> {
    const cacheKey = `${promoId}:${projectName}`;

    if (progressionCache.has(cacheKey)) {
        return progressionCache.get(cacheKey)!;
    }

    try {
        const progressions = await fetchPromotionProgressions(promoId);
        const groups = buildProjectGroups(progressions, projectName);
        progressionCache.set(cacheKey, groups);
        return groups;
    } catch (error) {
        console.error(`Error fetching groups for ${promoId}/${projectName}:`, error);
        return [];
    }
}

/**
 * Importe les audits depuis les données CSV parsées
 * Cette version matche les étudiants aux vrais groupes Zone01
 */
export async function importAuditsFromCsv(rows: CsvAuditRow[]): Promise<ImportResult> {
    const result: ImportResult = {
        total: rows.length,
        imported: 0,
        skipped: 0,
        errors: [],
        details: {
            matched: [],
            unmatched: [],
        },
    };

    // Clear the progression cache before starting
    progressionCache.clear();

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        try {
            // Extraire les données
            const logins = extractLogins(row.Groupe);
            if (logins.length === 0) {
                result.skipped++;
                result.details.unmatched.push({
                    row: i + 2,
                    logins: [],
                    reason: `Aucun étudiant trouvé dans "${row.Groupe}"`,
                });
                continue;
            }

            const projectName = normalizeProjectName(row.Projet);
            const track = getTrackByProjectName(projectName);
            if (!track) {
                result.skipped++;
                result.details.unmatched.push({
                    row: i + 2,
                    logins,
                    reason: `Projet inconnu "${row.Projet}"`,
                });
                continue;
            }

            const promoId = extractPromoId(row.Promotion);
            if (!promoId) {
                result.skipped++;
                result.details.unmatched.push({
                    row: i + 2,
                    logins,
                    reason: `Promotion inconnue "${row.Promotion}"`,
                });
                continue;
            }

            // Récupérer les groupes Zone01 pour ce projet
            const groups = await getProjectGroups(promoId, projectName);
            if (groups.length === 0) {
                result.skipped++;
                result.details.unmatched.push({
                    row: i + 2,
                    logins,
                    reason: `Aucun groupe Zone01 trouvé pour ${projectName}`,
                });
                continue;
            }

            // Trouver le groupe qui correspond aux logins
            const matchingGroup = findMatchingGroup(logins, groups);
            if (!matchingGroup) {
                result.skipped++;
                result.details.unmatched.push({
                    row: i + 2,
                    logins,
                    reason: `Aucun groupe Zone01 ne matche les étudiants [${logins.join(', ')}]`,
                });
                continue;
            }

            const groupId = matchingGroup.groupId;
            const auditDate = parseFrenchDate(row.Date) || parseFrenchDate(row['Date de création']) || new Date();
            const auditorName = row['Effectuée par'] || 'Import CSV';

            // Vérifier si l'audit existe déjà
            const existingAudit = await db.query.audits.findFirst({
                where: (audits, { and, eq }) => and(
                    eq(audits.promoId, promoId),
                    eq(audits.projectName, projectName),
                    eq(audits.groupId, groupId)
                ),
            });

            if (existingAudit) {
                result.skipped++;
                continue;
            }

            // Créer l'audit avec le vrai groupId Zone01
            const [newAudit] = await db.insert(audits).values({
                promoId,
                track,
                projectName,
                groupId,
                summary: row.Commentaire || null,
                warnings: [],
                auditorId: null,
                auditorName,
                createdAt: auditDate,
                updatedAt: auditDate,
            }).returning();

            // Créer les résultats pour les membres du groupe Zone01
            // (utiliser les membres du groupe Zone01, pas les logins du CSV)
            const groupMembers = matchingGroup.members;
            if (groupMembers.length > 0) {
                await db.insert(auditResults).values(
                    groupMembers.map(member => ({
                        auditId: newAudit.id,
                        studentLogin: member.login,
                        validated: true,
                        feedback: null,
                        warnings: [],
                        createdAt: auditDate,
                    }))
                );
            }

            result.imported++;
            result.details.matched.push({
                row: i + 2,
                groupId,
                logins: groupMembers.map(m => m.login),
            });

        } catch (error) {
            result.errors.push(`Ligne ${i + 2}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        }
    }

    return result;
}

/**
 * Supprime tous les audits avec des groupIds CSV (commençant par "csv-")
 */
export async function clearCsvAudits(): Promise<number> {
    const csvAudits = await db.query.audits.findMany({
        where: like(audits.groupId, 'csv-%'),
    });

    for (const audit of csvAudits) {
        await db.delete(audits).where(eq(audits.id, audit.id));
    }

    return csvAudits.length;
}

/**
 * Supprime TOUS les audits (reset complet)
 */
export async function clearAllAudits(): Promise<number> {
    const allAudits = await db.query.audits.findMany();

    // Delete all audit results first (FK constraint)
    await db.delete(auditResults);
    // Then delete all audits
    await db.delete(audits);

    return allAudits.length;
}
