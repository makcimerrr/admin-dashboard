// config.ts
import 'server-only';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

// TLS activé par défaut (Neon). Sur le Postgres interne du VPS (réseau Docker,
// sans TLS), mettre POSTGRES_SSL=disable.
const sql = postgres(process.env.POSTGRES_URL!, {
    ssl: process.env.POSTGRES_SSL === 'disable' ? false : true,
});

export const db = drizzle(sql, { schema });