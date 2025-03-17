import { db } from '../config';
import { updates, Update } from '../schema';
import { sql } from 'drizzle-orm';

/**
 * Mettre à jour la date de `last_update` dans la table `updates`.
 */
export async function updateLastUpdate(eventId: string) {
  const now = new Date();
  await db.insert(updates).values({ last_update: now, event_id: eventId });
  return { last_update: now, event_id: eventId };
}

/**
 * Récupérer la dernière date de mise à jour depuis la table `updates`.
 */
export async function getAllUpdates(): Promise<Update[]> {
  const updatesList = await db
    .select({
      eventId: updates.event_id,
      lastUpdate: sql<Date>`MAX(
            ${updates.last_update}
            )`.as('lastUpdate')
    })
    .from(updates)
    .groupBy(updates.event_id);

  // Transforme les résultats pour respecter la structure
  return updatesList.map((update) => ({
    last_update: update.lastUpdate,
    event_id: update.eventId
  }));
}
