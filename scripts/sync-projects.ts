#!/usr/bin/env tsx

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { projects } from '../lib/db/schema/projects';
// NOTE: This script was used to migrate projects from JSON to DB.
// Projects are now managed directly in the DB. This script is kept for reference only.
// The projects.json file no longer exists.
const projectsJson: Record<string, any[]> = {};
import { eq } from 'drizzle-orm';

// Charger les variables d'environnement
config();

// Créer une connexion directe à la DB
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

const db = drizzle(pool);

async function syncProjects() {
  console.log('🔄 Synchronizing projects from JSON to PostgreSQL...\n');

  const results = {
    inserted: 0,
    updated: 0,
    unchanged: 0,
    errors: [] as string[],
  };

  // Pour chaque catégorie (Golang, Javascript, Rust, Java)
  for (const [category, projectsList] of Object.entries(projectsJson)) {
    console.log(`\n📁 Processing category: ${category}`);

    // Pour chaque projet de cette catégorie
    for (let index = 0; index < (projectsList as any[]).length; index++) {
      const project = (projectsList as any[])[index];

      try {
        // Vérifier si le projet existe déjà en normalisant le nom
        const existingProjects = await db
          .select()
          .from(projects)
          .where(eq(projects.category, category));

        // Chercher une correspondance en normalisant les noms (enlever caractères spéciaux)
        const normalizedName = project.name.toLowerCase().replace(/[^a-z0-9 ]/g, '');
        const existing = existingProjects.find(p =>
          p.name.toLowerCase().replace(/[^a-z0-9 ]/g, '') === normalizedName
        );

        if (existing) {
          // Projet existe : mettre à jour si nécessaire
          if (existing.sort_index !== index || existing.projectTimeWeek !== project.project_time_week) {
            await db
              .update(projects)
              .set({
                sort_index: index,
                projectTimeWeek: project.project_time_week,
                name: project.name, // S'assurer que le nom est à jour
              })
              .where(eq(projects.id, existing.id));
            console.log(`  ✏️  Updated: ${project.name} (position ${index + 1})`);
            results.updated++;
          } else {
            console.log(`  ✓  Unchanged: ${project.name} (position ${index + 1})`);
            results.unchanged++;
          }
        } else {
          // Projet n'existe pas : l'insérer
          await db.insert(projects).values({
            name: project.name,
            projectTimeWeek: project.project_time_week,
            category,
            sort_index: index,
          });
          console.log(`  ✨ Inserted: ${project.name} (position ${index + 1})`);
          results.inserted++;
        }
      } catch (error) {
        const errorDetails = error instanceof Error ? error.message : String(error);
        const errorMsg = `Error processing ${project.name}: ${errorDetails}`;
        console.error(`  ❌ ${errorMsg}`);
        if (error instanceof Error && error.stack) {
          console.error(`     Stack: ${error.stack.split('\n').slice(0, 3).join('\n     ')}`);
        }
        results.errors.push(errorMsg);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Synchronization Results:');
  console.log('='.repeat(60));
  console.log(`✨ Inserted:  ${results.inserted} projects`);
  console.log(`✏️  Updated:   ${results.updated} projects`);
  console.log(`✓  Unchanged: ${results.unchanged} projects`);

  if (results.errors.length > 0) {
    console.log(`❌ Errors:    ${results.errors.length}`);
    results.errors.forEach(err => console.log(`   - ${err}`));
  }

  console.log('='.repeat(60));
  console.log('\n✅ Synchronization completed!\n');

  await pool.end();
  process.exit(0);
}

// Exécuter
syncProjects().catch(async (error) => {
  console.error('❌ Fatal error:', error);
  await pool.end();
  process.exit(1);
});
