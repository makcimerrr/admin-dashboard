/**
 * Utilitaire pour accéder à la configuration des promotions depuis la DB.
 * Les promos ne changent pas souvent → mise en cache 1h, invalidée
 * via `revalidateTag(CACHE_TAGS.promotions)` sur mutation.
 */

import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, CACHE_TTL } from '../cache';
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

export const getAllPromotions = unstable_cache(
    async (): Promise<PromoConfig[]> => {
        const rows = await getAllPromoConfig();
        return rows.map(dbRowToPromoConfig);
    },
    ['all-promotions'],
    { tags: [CACHE_TAGS.promotions], revalidate: CACHE_TTL.long },
);

export async function getActivePromotions(): Promise<PromoConfig[]> {
    const [all, archivedNames] = await Promise.all([
        getAllPromotions(),
        // Lazy import to avoid cycle: lib/db/filters imports CACHE_TTL/TAGS from lib/cache,
        // and lib/config/promotions also imports from lib/cache.
        import('@/lib/db/filters').then(m => m.getArchivedPromoNames()),
    ]);
    const now = new Date();
    return all.filter(
        (p) => new Date(p.dates.end) > now && !archivedNames.has(p.key),
    );
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
