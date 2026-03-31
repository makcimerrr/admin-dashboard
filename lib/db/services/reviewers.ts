import { db } from '../config';
import { reviewers, type Reviewer, type NewReviewer } from '../schema/reviewers';
export type { Reviewer, NewReviewer } from '../schema/reviewers';
import { eq } from 'drizzle-orm';

export async function getAllReviewers(activeOnly = true): Promise<Reviewer[]> {
  if (activeOnly) {
    return db.select().from(reviewers).where(eq(reviewers.isActive, true));
  }
  return db.select().from(reviewers);
}

export async function getReviewerById(id: number): Promise<Reviewer | null> {
  const rows = await db.select().from(reviewers).where(eq(reviewers.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getReviewersForTrack(track: string, promoKey?: string): Promise<Reviewer[]> {
  const all = await getAllReviewers();
  return all.filter(r => {
    if (!r.tracks.includes(track)) return false;
    if (promoKey && r.excludedPromos.includes(promoKey)) return false;
    return true;
  });
}

export async function createReviewer(data: Omit<NewReviewer, 'id' | 'createdAt'>): Promise<Reviewer> {
  const [created] = await db.insert(reviewers).values(data).returning();
  return created;
}

export async function updateReviewer(id: number, data: Partial<Omit<NewReviewer, 'id' | 'createdAt'>>): Promise<Reviewer | null> {
  const [updated] = await db.update(reviewers).set(data).where(eq(reviewers.id, id)).returning();
  return updated ?? null;
}

export async function deleteReviewer(id: number): Promise<void> {
  await db.delete(reviewers).where(eq(reviewers.id, id));
}

export async function getReviewerForRoundRobin(track: string | null, index: number, promoKey?: string): Promise<Reviewer | null> {
  const eligible = track
    ? await getReviewersForTrack(track, promoKey)
    : (await getAllReviewers()).filter(r => !promoKey || !r.excludedPromos.includes(promoKey));

  if (eligible.length === 0) return null;
  return eligible[index % eligible.length];
}
