import { NextResponse } from 'next/server';
import { getAllProjects, addProject } from '@/lib/db/services/projects';
import { db } from '@/lib/db/config';
import { projects } from '@/lib/db/schema/projects';
import { eq, and } from 'drizzle-orm';

/**
 * GET - Retourne les projets groupés par catégorie et triés par sort_index
 */
export async function GET() {
  const allProjects = await getAllProjects();
  const grouped: Record<string, any[]> = {};
  for (const project of allProjects) {
    if (!grouped[project.category]) grouped[project.category] = [];
    grouped[project.category].push({
      id: project.id,
      name: project.name,
      project_time_week: project.projectTimeWeek,
      sort_index: project.sort_index,
    });
  }
  for (const tech in grouped) {
    grouped[tech].sort((a, b) => (a.sort_index ?? 0) - (b.sort_index ?? 0));
  }
  return NextResponse.json(grouped);
}

/**
 * POST - Ajoute un nouveau projet à la fin de la catégorie
 */
export async function POST(req: Request) {
  const { name, project_time_week, tech } = await req.json();

  if (!name || !project_time_week || !tech) {
    return NextResponse.json({ error: 'Invalid project data.' }, { status: 400 });
  }

  const allProjects = await getAllProjects();
  const maxSortIndex = Math.max(
    0,
    ...allProjects.filter(p => p.category === tech).map(p => p.sort_index ?? 0)
  );
  await addProject({ name, projectTimeWeek: project_time_week, category: tech, sort_index: maxSortIndex + 1 });
  // Retourner la liste à jour
  const updatedProjects = await getAllProjects();
  const grouped: Record<string, any[]> = {};
  for (const project of updatedProjects) {
    if (!grouped[project.category]) grouped[project.category] = [];
    grouped[project.category].push({
      id: project.id,
      name: project.name,
      project_time_week: project.projectTimeWeek,
      sort_index: project.sort_index,
    });
  }
  for (const tech in grouped) {
    grouped[tech].sort((a, b) => (a.sort_index ?? 0) - (b.sort_index ?? 0));
  }
  return NextResponse.json({ message: 'Project added.', projects: grouped });
}

/**
 * DELETE - Supprime un projet
 * @param {Request} req - Requête DELETE avec un corps contenant {tech, id}
 */
export async function DELETE(req: Request) {
  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: 'Missing project id.' }, { status: 400 });
  }
  await db.delete(projects).where(eq(projects.id, id));
  // Retourner la liste à jour
  const updatedProjects = await getAllProjects();
  const grouped: Record<string, any[]> = {};
  for (const project of updatedProjects) {
    if (!grouped[project.category]) grouped[project.category] = [];
    grouped[project.category].push({
      id: project.id,
      name: project.name,
      project_time_week: project.projectTimeWeek,
      sort_index: project.sort_index,
    });
  }
  for (const tech in grouped) {
    grouped[tech].sort((a, b) => (a.sort_index ?? 0) - (b.sort_index ?? 0));
  }
  return NextResponse.json({ message: 'Project deleted.', projects: grouped });
}

/**
 * PATCH - Réorganise les projets d'une technologie
 */
export async function PATCH(req: Request) {
  const { tech, reorderedProjects } = await req.json();
  for (let i = 0; i < reorderedProjects.length; i++) {
    await db.update(projects)
      .set({ sort_index: i })
      .where(and(eq(projects.category, tech), eq(projects.id, reorderedProjects[i])));
  }
  // Retourner la liste à jour
  const updatedProjects = await getAllProjects();
  const grouped: Record<string, any[]> = {};
  for (const project of updatedProjects) {
    if (!grouped[project.category]) grouped[project.category] = [];
    grouped[project.category].push({
      id: project.id,
      name: project.name,
      project_time_week: project.projectTimeWeek,
      sort_index: project.sort_index,
    });
  }
  for (const tech in grouped) {
    grouped[tech].sort((a, b) => (a.sort_index ?? 0) - (b.sort_index ?? 0));
  }
  return NextResponse.json({ message: 'Projects reordered.', projects: grouped });
}