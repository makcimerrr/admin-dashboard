import { db } from '../config';
import { projects } from '../schema/projects';
import { eq } from 'drizzle-orm';
import { promotions } from '../schema/promotions';
import { holidays } from '../schema/holidays';

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

export async function getProjectById(id: number) {
  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result[0] || null;
}

export async function getPromoById(promoId: string) {
  const result = await db.select().from(promotions).where(eq(promotions.promoId, promoId)).limit(1);
  return result[0] || null;
}

export async function getHolidayById(id: number) {
  const result = await db.select().from(holidays).where(eq(holidays.id, id)).limit(1);
  return result[0] || null;
} 