import { db } from '../config';
import { students } from '../schema';
import { eq, and, or, sql, desc, asc } from 'drizzle-orm';

// ============== TYPES ==============

export interface AlternantInfo {
    id: number;
    login: string;
    firstName: string;
    lastName: string;
    promoName: string;
    isAlternant: boolean;
    alternantStartDate: Date | null;
    alternantEndDate: Date | null;
    companyName: string | null;
    companyContact: string | null;
    companyEmail: string | null;
    companyPhone: string | null;
    alternantNotes: string | null;
    isDropout: boolean;
}

export interface SetAlternantInput {
    studentLogin: string;
    isAlternant: boolean;
    startDate?: Date | string;
    endDate?: Date | string;
    companyName?: string;
    companyContact?: string;
    companyEmail?: string;
    companyPhone?: string;
    notes?: string;
}

export interface AlternantStats {
    total: number;
    byPromo: Record<string, number>;
    byCompany: Record<string, number>;
    activeContracts: number;
    endingSoon: number; // Contrats se terminant dans les 30 prochains jours
}

// ============== FONCTIONS ==============

/**
 * Récupère tous les alternants
 * @param promoName - Filtrer par promotion (optionnel)
 * @param includeDropouts - Inclure les perditions (défaut: false)
 */
export async function getAlternants(
    promoName?: string,
    includeDropouts = false
): Promise<AlternantInfo[]> {
    try {
        const conditions = [eq(students.isAlternant, true)];

        if (!includeDropouts) {
            conditions.push(eq(students.isDropout, false));
        }

        if (promoName) {
            conditions.push(eq(students.promoName, promoName));
        }

        const result = await db
            .select({
                id: students.id,
                login: students.login,
                firstName: students.first_name,
                lastName: students.last_name,
                promoName: students.promoName,
                isAlternant: students.isAlternant,
                alternantStartDate: students.alternantStartDate,
                alternantEndDate: students.alternantEndDate,
                companyName: students.companyName,
                companyContact: students.companyContact,
                companyEmail: students.companyEmail,
                companyPhone: students.companyPhone,
                alternantNotes: students.alternantNotes,
                isDropout: students.isDropout
            })
            .from(students)
            .where(and(...conditions))
            .orderBy(asc(students.last_name), asc(students.first_name))
            .execute();

        return result.map(r => ({
            ...r,
            isAlternant: r.isAlternant ?? false,
            isDropout: r.isDropout ?? false
        }));
    } catch (error) {
        console.error('Erreur lors de la récupération des alternants:', error);
        throw error;
    }
}

/**
 * Récupère un alternant par son login
 */
export async function getAlternantByLogin(login: string): Promise<AlternantInfo | null> {
    try {
        const result = await db
            .select({
                id: students.id,
                login: students.login,
                firstName: students.first_name,
                lastName: students.last_name,
                promoName: students.promoName,
                isAlternant: students.isAlternant,
                alternantStartDate: students.alternantStartDate,
                alternantEndDate: students.alternantEndDate,
                companyName: students.companyName,
                companyContact: students.companyContact,
                companyEmail: students.companyEmail,
                companyPhone: students.companyPhone,
                alternantNotes: students.alternantNotes,
                isDropout: students.isDropout
            })
            .from(students)
            .where(eq(students.login, login))
            .execute();

        if (result.length === 0) {
            return null;
        }

        return {
            ...result[0],
            isAlternant: result[0].isAlternant ?? false,
            isDropout: result[0].isDropout ?? false
        };
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'alternant:', error);
        throw error;
    }
}

/**
 * Définit/Met à jour le statut alternant d'un étudiant
 */
export async function setAlternantStatus(input: SetAlternantInput): Promise<AlternantInfo> {
    try {
        // Vérifier que l'étudiant existe
        const existing = await db
            .select({ id: students.id })
            .from(students)
            .where(eq(students.login, input.studentLogin))
            .execute();

        if (existing.length === 0) {
            throw new Error(`Étudiant "${input.studentLogin}" non trouvé.`);
        }

        // Préparer les données de mise à jour
        const updateData: Record<string, unknown> = {
            isAlternant: input.isAlternant
        };

        if (input.isAlternant) {
            if (input.startDate) {
                updateData.alternantStartDate = new Date(input.startDate);
            }
            if (input.endDate) {
                updateData.alternantEndDate = new Date(input.endDate);
            }
            if (input.companyName !== undefined) {
                updateData.companyName = input.companyName || null;
            }
            if (input.companyContact !== undefined) {
                updateData.companyContact = input.companyContact || null;
            }
            if (input.companyEmail !== undefined) {
                updateData.companyEmail = input.companyEmail || null;
            }
            if (input.companyPhone !== undefined) {
                updateData.companyPhone = input.companyPhone || null;
            }
            if (input.notes !== undefined) {
                updateData.alternantNotes = input.notes || null;
            }
        } else {
            // Si on retire le statut alternant, on peut garder les infos historiques
            // ou les effacer selon le besoin métier
        }

        await db
            .update(students)
            .set(updateData)
            .where(eq(students.login, input.studentLogin))
            .execute();

        // Récupérer et retourner l'étudiant mis à jour
        const updated = await getAlternantByLogin(input.studentLogin);
        if (!updated) {
            throw new Error('Erreur lors de la récupération de l\'étudiant mis à jour');
        }

        return updated;
    } catch (error) {
        console.error('Erreur lors de la mise à jour du statut alternant:', error);
        throw error;
    }
}

/**
 * Récupère les statistiques des alternants
 */
export async function getAlternantStats(): Promise<AlternantStats> {
    try {
        const now = new Date();
        const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        // Récupérer tous les alternants actifs (non perditions)
        const alternants = await getAlternants(undefined, false);

        // Calcul des stats
        const stats: AlternantStats = {
            total: alternants.length,
            byPromo: {},
            byCompany: {},
            activeContracts: 0,
            endingSoon: 0
        };

        for (const alt of alternants) {
            // Par promo
            stats.byPromo[alt.promoName] = (stats.byPromo[alt.promoName] || 0) + 1;

            // Par entreprise
            const company = alt.companyName || 'Non renseigné';
            stats.byCompany[company] = (stats.byCompany[company] || 0) + 1;

            // Contrats actifs
            const startOk = !alt.alternantStartDate || new Date(alt.alternantStartDate) <= now;
            const endOk = !alt.alternantEndDate || new Date(alt.alternantEndDate) >= now;
            if (startOk && endOk) {
                stats.activeContracts++;
            }

            // Contrats se terminant bientôt
            if (alt.alternantEndDate) {
                const endDate = new Date(alt.alternantEndDate);
                if (endDate >= now && endDate <= in30Days) {
                    stats.endingSoon++;
                }
            }
        }

        return stats;
    } catch (error) {
        console.error('Erreur lors du calcul des statistiques alternants:', error);
        throw error;
    }
}

/**
 * Récupère les alternants par entreprise
 */
export async function getAlternantsByCompany(companyName: string): Promise<AlternantInfo[]> {
    try {
        const result = await db
            .select({
                id: students.id,
                login: students.login,
                firstName: students.first_name,
                lastName: students.last_name,
                promoName: students.promoName,
                isAlternant: students.isAlternant,
                alternantStartDate: students.alternantStartDate,
                alternantEndDate: students.alternantEndDate,
                companyName: students.companyName,
                companyContact: students.companyContact,
                companyEmail: students.companyEmail,
                companyPhone: students.companyPhone,
                alternantNotes: students.alternantNotes,
                isDropout: students.isDropout
            })
            .from(students)
            .where(and(
                eq(students.isAlternant, true),
                eq(students.isDropout, false),
                eq(students.companyName, companyName)
            ))
            .orderBy(asc(students.last_name), asc(students.first_name))
            .execute();

        return result.map(r => ({
            ...r,
            isAlternant: r.isAlternant ?? false,
            isDropout: r.isDropout ?? false
        }));
    } catch (error) {
        console.error('Erreur lors de la récupération des alternants par entreprise:', error);
        throw error;
    }
}

/**
 * Récupère la liste des entreprises distinctes
 */
export async function getCompanies(): Promise<string[]> {
    try {
        const result = await db
            .selectDistinct({ companyName: students.companyName })
            .from(students)
            .where(and(
                eq(students.isAlternant, true),
                sql`${students.companyName} IS NOT NULL`
            ))
            .orderBy(asc(students.companyName))
            .execute();

        return result.map(r => r.companyName!).filter(Boolean);
    } catch (error) {
        console.error('Erreur lors de la récupération des entreprises:', error);
        throw error;
    }
}
