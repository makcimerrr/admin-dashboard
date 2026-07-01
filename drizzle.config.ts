// drizzle.config.ts
import 'dotenv/config';
import type { Config } from 'drizzle-kit';

// Source de connexion UNIQUE : POSTGRES_URL (même variable que le runtime,
// cf. lib/db/config.ts). Le Postgres interne du VPS est sans TLS ; pour une
// base distante avec TLS, ajouter `?sslmode=require` dans l'URL.
export default {
  schema: './lib/db/schema',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
} satisfies Config;
