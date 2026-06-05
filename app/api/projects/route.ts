import { NextResponse } from 'next/server';
import { db } from '@/lib/db/config';
import { projects } from '@/lib/db/schema/projects';
import { getAllProjects, addProject, deleteProject, setProjectOptional } from '@/lib/db/services/projects';
import { dbProjectsToConfig } from '@/lib/config/projects';
import { eq, asc } from 'drizzle-orm';
import { CACHE_TAGS, invalidate } from '@/lib/cache';

/**
 * GET - Retourne les projets groupés par catégorie
 */
export async function GET() {
  const rows = await getAllProjects();
  const grouped = dbProjectsToConfig(rows);
  return NextResponse.json(grouped);
}

/**
 * POST - Ajoute un nouveau projet
 */
export async function POST(req: Request) {
  const { name, project_time_week, tech, optional } = await req.json();

  if (!name || !project_time_week || !tech) {
    return NextResponse.json({ error: 'Invalid project data.' }, { status: 400 });
  }

  // Determine next sort_index for this category
  const existing = await db
    .select()
    .from(projects)
    .where(eq(projects.category, tech))
    .orderBy(asc(projects.sort_index));

  const nextSortIndex = existing.length;

  await addProject({
    name,
    projectTimeWeek: project_time_week,
    category: tech,
    sort_index: nextSortIndex,
    optional: optional === true,
  });
  invalidate(CACHE_TAGS.projects);

  const rows = await getAllProjects();
  const grouped = dbProjectsToConfig(rows);
  return NextResponse.json({ message: 'Project added.', projects: grouped });
}

/**
 * DELETE - Supprime un projet par id
 */
export async function DELETE(req: Request) {
  const { tech, id } = await req.json();

  if (!id) {
    return NextResponse.json({ error: 'Project id required.' }, { status: 400 });
  }

  await deleteProject(id);
  invalidate(CACHE_TAGS.projects);

  const rows = await getAllProjects();
  const grouped = dbProjectsToConfig(rows);
  return NextResponse.json({ message: 'Project deleted.', projects: grouped });
}

/**
 * PATCH - Réorganise les projets d'une technologie, ou bascule l'option
 * « optionnel » d'un projet selon le payload reçu.
 *
 * - `{ id, optional }`         → met à jour le flag `optional` du projet.
 * - `{ tech, reorderedProjects }` → réordonne les projets de la techno.
 */
export async function PATCH(req: Request) {
  const body: {
    tech?: string;
    reorderedProjects?: number[];
    id?: number;
    optional?: boolean;
  } = await req.json();

  // Branche 1 : bascule du flag optionnel.
  if (typeof body.id === 'number' && typeof body.optional === 'boolean') {
    await setProjectOptional(body.id, body.optional);
    invalidate(CACHE_TAGS.projects);

    const rows = await getAllProjects();
    const grouped = dbProjectsToConfig(rows);
    return NextResponse.json({ message: 'Project updated.', projects: grouped });
  }

  // Branche 2 : réorganisation.
  const { tech, reorderedProjects } = body;

  if (!tech || !reorderedProjects) {
    return NextResponse.json({ error: 'Tech and reorderedProjects required.' }, { status: 400 });
  }

  // Update sort_index for each project
  for (let i = 0; i < reorderedProjects.length; i++) {
    await db
      .update(projects)
      .set({ sort_index: i })
      .where(eq(projects.id, reorderedProjects[i]));
  }
  invalidate(CACHE_TAGS.projects);

  const rows = await getAllProjects();
  const grouped = dbProjectsToConfig(rows);
  return NextResponse.json({ message: 'Projects reordered.', projects: grouped });
}
