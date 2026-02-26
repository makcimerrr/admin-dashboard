/**
 * Utilitaire pour accéder à la configuration des promotions depuis la DB
 */

import { getAllPromoConfig, getPromoConfigByKey } from '../db/services/promoConfig';

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

export function dbRowToPromoConfig(row: any): PromoConfig {
    return {
        key: row.key,
        eventId: row.eventId,
        title: row.title,
        dates: {
            start: row.start,
            'piscine-js-start': row.piscineJsStart ?? 'NaN',
            'piscine-js-end': row.piscineJsEnd ?? 'NaN',
            'piscine-rust-java-start': row.piscineRustStart ?? 'NaN',
            'piscine-rust-java-end': row.piscineRustEnd ?? 'NaN',
            end: row.end,
        },
    };
}

export async function getAllPromotions(): Promise<PromoConfig[]> {
    const rows = await getAllPromoConfig();
    return rows.map(dbRowToPromoConfig);
}

export async function getActivePromotions(): Promise<PromoConfig[]> {
    const all = await getAllPromotions();
    const now = new Date();
    return all.filter(p => new Date(p.dates.end) > now);
}

export async function getPromotionByEventId(eventId: number): Promise<PromoConfig | undefined> {
    const all = await getAllPromotions();
    return all.find(p => p.eventId === eventId);
}

export async function getPromotionByKey(key: string): Promise<PromoConfig | undefined> {
    const rows = await getPromoConfigByKey(key);
    return rows[0] ? dbRowToPromoConfig(rows[0]) : undefined;
}

export function eventIdToString(eventId: number): string {
    return String(eventId);
}

export async function parsePromoId(promoId: string): Promise<PromoConfig | undefined> {
    const eventId = parseInt(promoId, 10);
    if (!isNaN(eventId)) {
        return getPromotionByEventId(eventId);
    }
    return getPromotionByKey(promoId);
}
