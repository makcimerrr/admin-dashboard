// config.ts
import 'server-only';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const sql = postgres(process.env.POSTGRES_URL!, {
    ssl: true
});

export const db = drizzle(sql, { schema });