import { NextResponse } from 'next/server';
import { db } from '@/lib/db/config';
import { projects } from '@/lib/db/schema/projects';
import { getAllProjects, addProject, deleteProject } from '@/lib/db/services/projects';
import { dbProjectsToConfig } from '@/lib/config/projects';
import { eq, asc } from 'drizzle-orm';

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
  const { name, project_time_week, tech } = await req.json();

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
  });

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

  const rows = await getAllProjects();
  const grouped = dbProjectsToConfig(rows);
  return NextResponse.json({ message: 'Project deleted.', projects: grouped });
}

/**
 * PATCH - Réorganise les projets d'une technologie
 */
export async function PATCH(req: Request) {
  const { tech, reorderedProjects }: { tech: string; reorderedProjects: number[] } = await req.json();

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

  const rows = await getAllProjects();
  const grouped = dbProjectsToConfig(rows);
  return NextResponse.json({ message: 'Projects reordered.', projects: grouped });
}
