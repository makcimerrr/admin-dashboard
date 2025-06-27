import { db } from '../config';
import { projects } from '../schema/projects';
import { eq } from 'drizzle-orm';

export async function getAllProjects() {
  return db.select().from(projects);
}

export async function getProjectsByCategory(category: string) {
  return db.select().from(projects).where(eq(projects.category, category));
}

export async function addProject(data: any) {
  await db.insert(projects).values(data);
}

export async function deleteProject(id: number) {
  await db.delete(projects).where(eq(projects.id, id));
} 