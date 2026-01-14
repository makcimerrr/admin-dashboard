import { NextResponse } from 'next/server';
import { db } from '@/lib/db/config';
import { students, studentSpecialtyProgress } from '@/lib/db/schema';
import { eq, count } from 'drizzle-orm';

export async function GET() {
  try {
    const tracks = ['golang', 'javascript', 'rust', 'java'] as const;
    
    // Récupérer le total d'étudiants une seule fois
    const totalQuery = await db.select({ count: count() }).from(students).execute();
    const total = totalQuery[0]?.count || 0;

    // Exécuter toutes les requêtes de comptage en parallèle
    const results = await Promise.all(
      tracks.map(async (track) => {
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

        const completedQuery = await db
          .select({ count: count() })
          .from(students)
          .leftJoin(studentSpecialtyProgress, eq(students.id, studentSpecialtyProgress.student_id))
          .where(eq(completedColumn, true))
          .execute();

        const completed = completedQuery[0]?.count || 0;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
          track: track.charAt(0).toUpperCase() + track.slice(1),
          completed,
          total,
          percentage,
        };
      })
    );

    return NextResponse.json({
      success: true,
      tracks: results,
    });
  } catch (error) {
    console.error('Error fetching track progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch track data' },
      { status: 500 }
    );
  }
}
