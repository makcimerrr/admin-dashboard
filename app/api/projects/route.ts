import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const projectsFilePath = path.join(process.cwd(), 'config/projects.json');

// Charger les données initiales
let projects = JSON.parse(fs.readFileSync(projectsFilePath, 'utf-8'));

/**
 * GET - Retourne les projets
 */
export async function GET() {
  return NextResponse.json(projects);
}

/**
 * POST - Ajoute un nouveau projet
 * @param {Request} req - Requête POST avec un corps contenant {name, project_time_week, tech}
 */
export async function POST(req: Request) {
  const { name, project_time_week, tech } = await req.json();

  if (!name || !project_time_week || !tech) {
    return NextResponse.json({ error: 'Invalid project data.' }, { status: 400 });
  }

  const nextId = Math.max(...Object.values(projects).flat().map((p: any) => p.id)) + 1;
  const newProject = { id: nextId, name, project_time_week };

  if (!projects[tech]) projects[tech] = [];
  projects[tech].push(newProject);

  // Sauvegarder les changements
  fs.writeFileSync(projectsFilePath, JSON.stringify(projects, null, 2));

  return NextResponse.json({ message: 'Project added.', projects });
}

/**
 * DELETE - Supprime un projet
 * @param {Request} req - Requête DELETE avec un corps contenant {tech, id}
 */
export async function DELETE(req: Request) {
  const { tech, id } = await req.json();

  if (!projects[tech]) {
    return NextResponse.json({ error: 'Tech not found.' }, { status: 400 });
  }

  projects[tech] = projects[tech].filter((p: any) => p.id !== id);

  if (projects[tech].length === 0) delete projects[tech];

  // Sauvegarder les changements
  fs.writeFileSync(projectsFilePath, JSON.stringify(projects, null, 2));

  return NextResponse.json({ message: 'Project deleted.', projects });
}

/**
 * PATCH - Réorganise les projets d'une technologie
 * @param {Request} req - Requête PATCH avec un corps contenant {tech, reorderedProjects}
 */
export async function PATCH(req: Request) {
  const { tech, reorderedProjects } = await req.json();

  if (!projects[tech]) {
    return NextResponse.json({ error: 'Tech not found.' }, { status: 400 });
  }

  projects[tech].sort(
    (a: any, b: any) => reorderedProjects.indexOf(a.id) - reorderedProjects.indexOf(b.id)
  );

  // Sauvegarder les changements
  fs.writeFileSync(projectsFilePath, JSON.stringify(projects, null, 2));

  return NextResponse.json({ message: 'Projects reordered.', projects });
}