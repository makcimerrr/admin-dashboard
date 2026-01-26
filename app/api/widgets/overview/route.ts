import { NextResponse } from 'next/server';
import { db } from '@/lib/db/config';
import { students, studentProjects, promotions } from '@/lib/db/schema';
import { count, sql, eq, and } from 'drizzle-orm';

export async function GET() {
  try {
    const [
      totalStudentsResult,
      totalPromosResult,
      goodProgressResult,
      lateStudentsResult,
      validatedResult
    ] = await Promise.all([
      // Total étudiants (exclure les perditions)
      db.select({ count: count() })
        .from(students)
        .where(eq(students.isDropout, false))
        .execute(),
      // Total promotions
      db.select({ count: count() }).from(promotions).execute(),
      // Étudiants en bonne progression (bien) - exclure les perditions
      db.select({ count: count() })
        .from(studentProjects)
        .innerJoin(students, eq(studentProjects.student_id, students.id))
        .where(and(
          sql`${studentProjects.delay_level} = 'bien'`,
          eq(students.isDropout, false)
        ))
        .execute(),
      // Étudiants en retard - exclure les perditions
      db.select({ count: count() })
        .from(studentProjects)
        .innerJoin(students, eq(studentProjects.student_id, students.id))
        .where(and(
          sql`${studentProjects.delay_level} = 'en retard'`,
          eq(students.isDropout, false)
        ))
        .execute(),
      // Étudiants validés - exclure les perditions
      db.select({ count: count() })
        .from(studentProjects)
        .innerJoin(students, eq(studentProjects.student_id, students.id))
        .where(and(
          sql`${studentProjects.delay_level} = 'Validé'`,
          eq(students.isDropout, false)
        ))
        .execute()
    ]);

    const totalStudents = totalStudentsResult[0]?.count || 0;
    const totalPromos = totalPromosResult[0]?.count || 0;
    const goodProgress = goodProgressResult[0]?.count || 0;
    const lateStudents = lateStudentsResult[0]?.count || 0;
    const validated = validatedResult[0]?.count || 0;

    // Calculer le taux de réussite
    const successRate = totalStudents > 0
      ? Math.round((goodProgress / totalStudents) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalStudents,
        totalPromos,
        goodProgress,
        lateStudents,
        validated,
        successRate,
      },
    });
  } catch (error) {
    console.error('Error fetching overview widget data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
