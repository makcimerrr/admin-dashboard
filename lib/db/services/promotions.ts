import { db } from '../config';
import { promotions, delayStatus } from '../schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Ajoute une promotion à la base de données.
 * @param promoId - ID unique de la promotion.
 * @param name - Nom ou description de la promotion.
 * @returns Un message de succès ou une erreur si la promo existe déjà.
 */
export async function addPromotion(
    promoId: string,
    name: string
): Promise<string> {
    try {
        // Vérifie si la promotion existe déjà
        const existingPromo = await db
            .select()
            .from(promotions)
            .where(eq(promotions.promoId, promoId))
            .execute();

        if (existingPromo.length > 0) {
            return `La promotion avec l'ID "${promoId}" existe déjà.`;
        }

        // Ajoute la nouvelle promotion
        await db.insert(promotions).values({ promoId, name }).execute();

        return `Promotion "${name}" (ID: ${promoId}) ajoutée avec succès.`;
    } catch (error) {
        console.error("Erreur lors de l'ajout de la promotion:", error);
        throw new Error("Impossible d'ajouter la promotion.");
    }
}

/**
 * Supprime une promotion de la base de données.
 * @param key - Clé de la promotion.
 * @returns Un message de succès ou une erreur si la promo n'existe pas.
 */
export async function deletePromotion(key: string): Promise<string> {
    try {
        // Vérifier si la promotion existe
        const existingPromo = await db
            .select()
            .from(promotions)
            .where(eq(promotions.name, key))
            .execute();

        if (existingPromo.length === 0) {
            return `La promotion avec le nom "${key}" n'existe pas.`;
        }

        // Supprimer la promotion
        await db.delete(promotions).where(eq(promotions.name, key)).execute();

        return `Promotion "${key}" supprimée avec succès.`;
    } catch (error) {
        console.error('Erreur lors de la suppression de la promotion:', error);
        throw new Error('Impossible de supprimer la promotion.');
    }
}

/**
 * Initialise les compteurs de statut de retard pour une promotion spécifique.
 * @param promoId L'ID unique de la promotion.
 */
export async function addDelayCountersForPromo(
    promoId: string
): Promise<string> {
    try {
        // Vérifier si la promo a déjà des compteurs dans la table delay_status
        const existingEntry = await db
            .select()
            .from(delayStatus)
            .where(eq(delayStatus.promoId, promoId));

        if (existingEntry.length > 0) {
            return `Les compteurs pour la promotion ${promoId} existent déjà.`;
        }

        // Insérer une nouvelle ligne pour la promotion avec les compteurs initialisés à 0
        await db.insert(delayStatus).values({
            promoId,
            lateCount: 0,
            goodLateCount: 0,
            advanceLateCount: 0,
            specialityCount: 0,
            lastUpdate: new Date()
        });

        return `Les compteurs pour la promotion ${promoId} ont été ajoutés avec succès.`;
    } catch (error) {
        console.error(`Erreur lors de l'ajout des compteurs :`, error);
        throw new Error(`Erreur lors de l'ajout des compteurs pour la promotion.`);
    }
}

export async function getAverageDelaysByMonth(promoId: string) {
    return await db
        .select({
            month: sql`DATE_TRUNC('month', ${delayStatus.lastUpdate})`.as('month'),
            avgLateCount: sql`AVG(${delayStatus.lateCount})`.as('avgLateCount'),
            avgGoodLateCount: sql`AVG(${delayStatus.goodLateCount})`.as('avgGoodLateCount')
        })
        .from(delayStatus)
        .where(sql`${delayStatus.promoId} = ${promoId}`)
        .groupBy(sql`DATE_TRUNC('month', ${delayStatus.lastUpdate})`)
        .orderBy(sql`DATE_TRUNC('month', ${delayStatus.lastUpdate})`);
}

export async function getDelayStatus(promoId: string): Promise<{
    lateCount: number;
    goodLateCount: number;
    advanceLateCount: number;
    specialityCount: number;
}> {
    try {
        // Récupérer les données de delayStatus en fonction du promoId
        const delayStatusData = await db
            .select({
                lateCount: delayStatus.lateCount,
                goodLateCount: delayStatus.goodLateCount,
                advanceLateCount: delayStatus.advanceLateCount,
                specialityCount: delayStatus.specialityCount
            })
            .from(delayStatus)
            .where(eq(delayStatus.promoId, promoId))
            .execute();

        // Vérifier si un résultat a été trouvé
        if (delayStatusData.length === 0) {
            throw new Error(
                `Aucun statut de retard trouvé pour la promotion avec l'ID "${promoId}".`
            );
        }

        // Retourner les valeurs du premier résultat trouvé
        return {
            lateCount: delayStatusData[0].lateCount || 0,
            goodLateCount: delayStatusData[0].goodLateCount || 0,
            advanceLateCount: delayStatusData[0].advanceLateCount || 0,
            specialityCount: delayStatusData[0].specialityCount || 0
        };
    } catch (error) {
        console.error(
            'Erreur lors de la recherche des compteurs de retard:',
            error
        );
        throw new Error('Impossible de trouver les compteurs de retard.');
    }
}