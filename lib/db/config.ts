// config.ts
import 'server-only';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

const sql = postgres(process.env.POSTGRES_URL!, {
    ssl: false // désactive SSL
});

export const db = drizzle(sql);