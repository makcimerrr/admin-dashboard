import { db } from '../config';
import { projects } from '../schema/projects';
import { eq } from 'drizzle-orm';

type NewProject = typeof projects.$inferInsert;

export async function getAllProjects() {
  return db.select().from(projects);
}

export async function addProject(data: NewProject) {
  await db.insert(projects).values(data);
}

export async function deleteProject(id: number) {
  await db.delete(projects).where(eq(projects.id, id));
}

export async function setProjectOptional(id: number, optional: boolean) {
  await db.update(projects).set({ optional }).where(eq(projects.id, id));
}
