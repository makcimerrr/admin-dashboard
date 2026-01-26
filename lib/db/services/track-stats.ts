import { db } from '../config';
import { students, studentSpecialtyProgress } from '../schema';
import { eq, and, count } from 'drizzle-orm';

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
      // Exclure les étudiants en perdition
      const completedConditions = [
        eq(completedColumn, true),
        eq(students.isDropout, false)
      ];
      if (promoName) {
        completedConditions.push(eq(students.promoName, promoName));
      }

      const completedQuery = db
        .select({ count: count() })
        .from(students)
        .leftJoin(studentSpecialtyProgress, eq(students.id, studentSpecialtyProgress.student_id))
        .where(and(...completedConditions));

      const completedResult = await completedQuery.execute();

      // Construire la requête pour compter les étudiants avec le tronc en cours
      // Exclure les étudiants en perdition
      const inProgressConditions = [
        eq(completedColumn, false),
        eq(students.isDropout, false)
      ];
      if (promoName) {
        inProgressConditions.push(eq(students.promoName, promoName));
      }

      const inProgressQuery = db
        .select({ count: count() })
        .from(students)
        .leftJoin(studentSpecialtyProgress, eq(students.id, studentSpecialtyProgress.student_id))
        .where(and(...inProgressConditions));

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
