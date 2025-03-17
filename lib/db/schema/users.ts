import { serial, varchar, pgTable } from 'drizzle-orm/pg-core';

// User schema definition
export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 255 }),
    username: varchar('username', { length: 255 }),
    password: varchar('password', { length: 255 }),
    role: varchar('role', { length: 50 }).default('user')
});