const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL not found in environment');
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  try {
    console.log('Applying conversations migration...');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../drizzle/migrations/0003_add_conversations.sql'),
      'utf-8'
    );

    await sql(migrationSQL);

    console.log('✅ Migration applied successfully!');
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  }
}

applyMigration();
