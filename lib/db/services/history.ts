import { db } from '../config';
import { history, History } from '../schema/history';
import { eq, and, desc } from 'drizzle-orm';

export async function addHistoryEntry(entry: Omit<History, 'id' | 'date'> & { date?: Date }) {
  const now = entry.date || new Date();
  await db.insert(history).values({ ...entry, date: now });
}

export async function getHistory({ type, userId, action, limit = 100 }: { type?: string; userId?: string; action?: string; limit?: number }) {
  let whereClauses = [];
  if (type) whereClauses.push(eq(history.type, type));
  if (userId) whereClauses.push(eq(history.userId, userId));
  if (action) whereClauses.push(eq(history.action, action));
  const where = whereClauses.length > 0 ? and(...whereClauses) : undefined;
  const query = db.select().from(history)
    .where(where)
    .orderBy(desc(history.date))
    .limit(limit);
  return await query;
} 