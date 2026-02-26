import { pgTable, serial, varchar, timestamp } from 'drizzle-orm/pg-core';

export const discordUsers = pgTable('discord_users', {
  id: serial('id').primaryKey(),
  login: varchar('login', { length: 100 }).notNull().unique(),
  discordId: varchar('discord_id', { length: 30 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
