import { db } from '../config';
import { students, studentSpecialtyProgress } from '../schema';
import { eq, and, count, sql } from 'drizzle-orm';

export interface TrackStats {
  track: string;
  completed: number;
  inProgress: number;
  total: number;
  completionRate: number;
}

export async function getTrackStatsByPromo(promoName: string | null): Promise<TrackStats[]> {
  try {
    // Requête pour chaque tronc
    const tracks = ['golang', 'javascript', 'rust', 'java'] as const;
    const stats: TrackStats[] = [];

    for (const track of tracks) {
      // Obtenir la référence de colonne directement
      let completedColumn;
      switch (track) {
        case 'golang':
          completedColumn = studentSpecialtyProgress.golang_completed;
          break;
        case 'javascript':
          completedColumn = studentSpecialtyProgress.javascript_completed;
          break;
        case 'rust':
          completedColumn = studentSpecialtyProgress.rust_completed;
          break;
        case 'java':
          completedColumn = studentSpecialtyProgress.java_completed;
          break;
      }

      // Construire la requête pour compter les étudiants avec le tronc terminé
      let completedQuery = db
        .select({ count: count() })
        .from(students)
        .leftJoin(studentSpecialtyProgress, eq(students.id, studentSpecialtyProgress.student_id));

      // Appliquer le filtre
      if (promoName) {
        completedQuery = completedQuery.where(
          and(eq(students.promoName, promoName), eq(completedColumn, true))
        );
      } else {
        completedQuery = completedQuery.where(eq(completedColumn, true));
      }

      const completedResult = await completedQuery.execute();

      // Construire la requête pour compter les étudiants avec le tronc en cours
      let inProgressQuery = db
        .select({ count: count() })
        .from(students)
        .leftJoin(studentSpecialtyProgress, eq(students.id, studentSpecialtyProgress.student_id));

      // Appliquer le filtre
      if (promoName) {
        inProgressQuery = inProgressQuery.where(
          and(eq(students.promoName, promoName), eq(completedColumn, false))
        );
      } else {
        inProgressQuery = inProgressQuery.where(eq(completedColumn, false));
      }

      const inProgressResult = await inProgressQuery.execute();

      const completed = completedResult[0]?.count || 0;
      const inProgress = inProgressResult[0]?.count || 0;
      const total = completed + inProgress;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      stats.push({
        track: track.charAt(0).toUpperCase() + track.slice(1),
        completed,
        inProgress,
        total,
        completionRate
      });
    }

    return stats;
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques des troncs:', error);
    throw error;
  }
}
