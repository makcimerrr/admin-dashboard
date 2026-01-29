import { NextResponse } from 'next/server';
import { db } from '@/lib/db/config';
import { projects } from '@/lib/db/schema/projects';
import projectsJson from '../../../../config/projects.json';
import { eq } from 'drizzle-orm';

/**
 * POST /api/projects/sync
 *
 * Synchronise le fichier config/projects.json avec la table PostgreSQL projects
 * Cette route doit être appelée pour s'assurer que tous les projets ont une position dans la DB
 */
export async function POST() {
  try {
    const results = {
      inserted: 0,
      updated: 0,
      unchanged: 0,
      errors: [] as string[],
    };

    // Pour chaque catégorie (Golang, Javascript, Rust, Java)
    for (const [category, projectsList] of Object.entries(projectsJson)) {
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
              results.updated++;
            } else {
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
            results.inserted++;
          }
        } catch (error) {
          results.errors.push(`Error processing ${project.name}: ${error}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Projects synchronization completed',
      results,
    });
  } catch (error) {
    console.error('Error syncing projects:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync projects',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/sync
 *
 * Affiche un diagnostic des projets (comparaison JSON vs DB)
 */
export async function GET() {
  try {
    const diagnostics: Record<string, any> = {};

    for (const [category, projectsList] of Object.entries(projectsJson)) {
      const dbProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.category, category));

      const jsonProjects = (projectsList as any[]).map(p => ({
        name: p.name,
        normalized: p.name.toLowerCase().replace(/[^a-z0-9 ]/g, ''),
      }));

      const dbProjectsNormalized = dbProjects.map(p => ({
        name: p.name,
        normalized: p.name.toLowerCase().replace(/[^a-z0-9 ]/g, ''),
        sort_index: p.sort_index,
      }));

      const missingInDb = jsonProjects.filter(
        jp => !dbProjectsNormalized.some(dp => dp.normalized === jp.normalized)
      );

      const extraInDb = dbProjectsNormalized.filter(
        dp => !jsonProjects.some(jp => jp.normalized === dp.normalized)
      );

      diagnostics[category] = {
        inJson: jsonProjects.length,
        inDb: dbProjects.length,
        missingInDb: missingInDb.map(p => p.name),
        extraInDb: extraInDb.map(p => p.name),
      };
    }

    return NextResponse.json({
      success: true,
      diagnostics,
      hint: 'Use POST /api/projects/sync to synchronize',
    });
  } catch (error) {
    console.error('Error getting project diagnostics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get diagnostics',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
