import { db } from '../config';
import { projects } from '../schema/projects';
import { eq, max } from 'drizzle-orm';

type NewProject = typeof projects.$inferInsert;
type ProjectRow = typeof projects.$inferSelect;

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

/**
 * Met à jour un projet de façon non destructive.
 *
 * - `name` / `projectTimeWeek` : champs simples mis à jour tels quels.
 * - `category` : si la catégorie (track) change, le `sort_index` est recalculé
 *   pour ajouter proprement le projet en fin du nouveau track
 *   (`max(sort_index) + 1`).
 *
 * Retourne la ligne mise à jour, ou `undefined` si l'id n'existe pas.
 */
export async function updateProject(
  id: number,
  data: { name?: string; projectTimeWeek?: number; category?: string }
): Promise<ProjectRow | undefined> {
  const set: Partial<NewProject> = {};

  if (data.name !== undefined) set.name = data.name;
  if (data.projectTimeWeek !== undefined) set.projectTimeWeek = data.projectTimeWeek;

  if (data.category !== undefined) {
    // Le projet change de track : on lit l'état actuel pour ne recalculer
    // l'ordre que si la catégorie change réellement.
    const [current] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));

    set.category = data.category;

    if (current && current.category !== data.category) {
      const [{ maxIndex }] = await db
        .select({ maxIndex: max(projects.sort_index) })
        .from(projects)
        .where(eq(projects.category, data.category));

      set.sort_index = (maxIndex ?? -1) + 1;
    }
  }

  const [updated] = await db
    .update(projects)
    .set(set)
    .where(eq(projects.id, id))
    .returning();

  return updated;
}
