import { db } from '../config';
import { students, studentSpecialtyProgress } from '../schema';
import { eq, and, sql } from 'drizzle-orm';

export interface TrackStats {
  track: string;
  completed: number;
  inProgress: number;
  total: number;
  completionRate: number;
}

export async function getTrackStatsByPromo(promoName: string | null): Promise<TrackStats[]> {
  try {
    // Single query: count completed/in-progress for all 4 tracks at once
    const conditions = [eq(students.isDropout, false)];
    if (promoName) {
      conditions.push(eq(students.promoName, promoName));
    }

    const result = await db
      .select({
        golang_completed_count: sql<number>`COUNT(*) FILTER (WHERE ${studentSpecialtyProgress.golang_completed} = true)`,
        golang_in_progress_count: sql<number>`COUNT(*) FILTER (WHERE ${studentSpecialtyProgress.golang_completed} = false)`,
        javascript_completed_count: sql<number>`COUNT(*) FILTER (WHERE ${studentSpecialtyProgress.javascript_completed} = true)`,
        javascript_in_progress_count: sql<number>`COUNT(*) FILTER (WHERE ${studentSpecialtyProgress.javascript_completed} = false)`,
        rust_completed_count: sql<number>`COUNT(*) FILTER (WHERE ${studentSpecialtyProgress.rust_completed} = true)`,
        rust_in_progress_count: sql<number>`COUNT(*) FILTER (WHERE ${studentSpecialtyProgress.rust_completed} = false)`,
        java_completed_count: sql<number>`COUNT(*) FILTER (WHERE ${studentSpecialtyProgress.java_completed} = true)`,
        java_in_progress_count: sql<number>`COUNT(*) FILTER (WHERE ${studentSpecialtyProgress.java_completed} = false)`,
      })
      .from(students)
      .leftJoin(studentSpecialtyProgress, eq(students.id, studentSpecialtyProgress.student_id))
      .where(and(...conditions))
      .execute();

    const row = result[0];
    if (!row) return [];

    const tracks = [
      { name: 'Golang', completed: Number(row.golang_completed_count), inProgress: Number(row.golang_in_progress_count) },
      { name: 'Javascript', completed: Number(row.javascript_completed_count), inProgress: Number(row.javascript_in_progress_count) },
      { name: 'Rust', completed: Number(row.rust_completed_count), inProgress: Number(row.rust_in_progress_count) },
      { name: 'Java', completed: Number(row.java_completed_count), inProgress: Number(row.java_in_progress_count) },
    ];

    return tracks.map(({ name, completed, inProgress }) => {
      const total = completed + inProgress;
      return {
        track: name,
        completed,
        inProgress,
        total,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques des troncs:', error);
    throw error;
  }
}
