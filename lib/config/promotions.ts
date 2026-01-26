/**
 * Utilitaire pour accéder à la configuration des promotions
 */

import promoConfigData from '../../config/promoConfig.json';

export interface PromoConfig {
    key: string;
    eventId: number;
    title: string;
    dates: {
        start: string;
        'piscine-js-start': string;
        'piscine-js-end': string;
        'piscine-rust-java-start': string;
        'piscine-rust-java-end': string;
        end: string;
    };
}

const promoConfigs: PromoConfig[] = promoConfigData as PromoConfig[];

/**
 * Récupère toutes les promotions
 */
export function getAllPromotions(): PromoConfig[] {
    return promoConfigs;
}

/**
 * Récupère les promotions actives (non terminées)
 */
export function getActivePromotions(): PromoConfig[] {
    const now = new Date();
    return promoConfigs.filter(p => new Date(p.dates.end) > now);
}

/**
 * Récupère une promotion par son eventId
 */
export function getPromotionByEventId(eventId: number): PromoConfig | undefined {
    return promoConfigs.find(p => p.eventId === eventId);
}

/**
 * Récupère une promotion par sa clé
 */
export function getPromotionByKey(key: string): PromoConfig | undefined {
    return promoConfigs.find(p => p.key === key);
}

/**
 * Convertit un eventId en string pour les URLs
 */
export function eventIdToString(eventId: number): string {
    return String(eventId);
}

/**
 * Parse un promoId depuis une URL (peut être eventId ou key)
 */
export function parsePromoId(promoId: string): PromoConfig | undefined {
    // Essayer d'abord comme eventId
    const eventId = parseInt(promoId, 10);
    if (!isNaN(eventId)) {
        return getPromotionByEventId(eventId);
    }
    // Sinon comme key
    return getPromotionByKey(promoId);
}
