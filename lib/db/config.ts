// config.ts
import 'server-only';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

// Postgres interne du VPS (réseau Docker, sans TLS) → POSTGRES_SSL=disable.
// Pour une base distante avec TLS requis, laisser TLS activé (défaut).
const sql = postgres(process.env.POSTGRES_URL!, {
    ssl: process.env.POSTGRES_SSL === 'disable' ? false : true,
});

export const db = drizzle(sql, { schema });