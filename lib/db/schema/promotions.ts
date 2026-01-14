import { pgTable, text, timestamp, pgEnum, serial, integer, boolean } from 'drizzle-orm/pg-core';

// Promotion related schemas
export const promosEnum = pgEnum('promos', [
    'P1 2022',
    'P1 2023',
    'P2 2023',
    'P1 2024'
]);

export const promotions = pgTable('promotions', {
    promoId: text('promo_id').primaryKey(),
    name: text('name').unique().notNull()
});

export const delayStatus = pgTable('delays_status', {
    id: serial('id').primaryKey(),
    promoId: text('promo_id')
        .notNull()
        .references(() => promotions.promoId),
    lateCount: integer('late_count').default(0),
    goodLateCount: integer('good_late_count').default(0),
    advanceLateCount: integer('advance_late_count').default(0),
    specialityCount: integer('speciality_count').default(0),
    validatedCount: integer('validated_count').default(0),
    notValidatedCount: integer('not_validated_count').default(0),
    lastUpdate: timestamp('last_update').defaultNow()
});