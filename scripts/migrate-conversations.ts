import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { neon } from '@neondatabase/serverless';

async function runMigration() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  console.log('⏳ Running migrations...');

  try {
    await migrate(db, { migrationsFolder: './drizzle/migrations' });
    console.log('✅ Migrations completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
