#!/usr/bin/env tsx

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { resolve } from 'path';

config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL
});

const db = drizzle(pool);

async function applyMigration() {
  console.log('🔄 Application de la migration alternants...\n');

  try {
    const migrationPath = resolve(process.cwd(), 'drizzle/migrations/0009_add_alternant_contracts_documents.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Exécuter le SQL directement
    await pool.query(migrationSQL);

    console.log('✅ Migration appliquée avec succès!\n');
  } catch (error) {
    console.error('❌ Erreur lors de l\'application de la migration:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

applyMigration()
  .then(() => {
    console.log('✅ Terminé!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
