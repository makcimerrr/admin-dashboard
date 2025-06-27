// drizzle.config.ts
import 'dotenv/config';
import type { Config } from 'drizzle-kit';

console.log('DB_HOST:', process.env.PGHOST);

export default {
  schema: './lib/db/schema', // <- sans ".ts", juste le dossier ou fichier
  out: './drizzle/migrations',
  dialect: 'postgresql', // ou 'sqlite', 'mysql'
  dbCredentials: {
    host: process.env.PGHOST!,
    database: process.env.PGDATABASE!,
    user: process.env.PGUSER!,
    password: process.env.PGPASSWORD!,
  },
} satisfies Config;