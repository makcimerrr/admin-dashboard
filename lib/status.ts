import { getAllPromoStatus } from './db/services/promoStatus';

export async function getPromoStatus() {
    try {
        const rows = await getAllPromoStatus();
        // Retourner sous forme d'objet clé/valeur comme l'ancien JSON
        const result: Record<string, string> = {};
        for (const row of rows) {
            result[row.promoKey] = row.status;
        }
        return result;
    } catch (error) {
        console.error('Error reading promoStatus from DB:', error);
        throw new Error('DB error');
    }
}