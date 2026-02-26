import { pgTable, serial, timestamp, text, boolean } from 'drizzle-orm/pg-core';

export const updates = pgTable('updates', {
    id: serial('id').primaryKey(),
    last_update: timestamp('last_update').notNull(),
    event_id: text('event_id').notNull(),
    is_auto: boolean('is_auto').notNull().default(false)
});

export interface Update {
    last_update: Date;
    event_id: string;
    is_auto: boolean;
}