import { db } from '@/lib/db/config';
import { students, studentProjects, promotions } from '@/lib/db/schema';
import { count, sql, eq, and, or, isNull } from 'drizzle-orm';
import { apiSuccess, withAuth, withErrorHandler } from '@/lib/api';

export const GET = withErrorHandler(
  withAuth(async () => {
    const [
      totalStudentsResult,
      totalPromosResult,
      goodProgressResult,
      lateStudentsResult,
      validatedResult,
    ] = await Promise.all([
      // Total étudiants actifs (exclure perditions + promos archivées)
      db
        .select({ count: count() })
        .from(students)
        .innerJoin(promotions, eq(students.promoName, promotions.name))
        .where(
          and(
            eq(students.isDropout, false),
            or(eq(promotions.isArchived, false), isNull(promotions.isArchived)),
          ),
        )
        .execute(),
      // Total promotions actives
      db
        .select({ count: count() })
        .from(promotions)
        .where(or(eq(promotions.isArchived, false), isNull(promotions.isArchived)))
        .execute(),
      // Étudiants en bonne progression
      db
        .select({ count: count() })
        .from(studentProjects)
        .innerJoin(students, eq(studentProjects.student_id, students.id))
        .where(and(sql`${studentProjects.delay_level} = 'bien'`, eq(students.isDropout, false)))
        .execute(),
      // Étudiants en retard
      db
        .select({ count: count() })
        .from(studentProjects)
        .innerJoin(students, eq(studentProjects.student_id, students.id))
        .where(and(sql`${studentProjects.delay_level} = 'en retard'`, eq(students.isDropout, false)))
        .execute(),
      // Étudiants validés
      db
        .select({ count: count() })
        .from(studentProjects)
        .innerJoin(students, eq(studentProjects.student_id, students.id))
        .where(and(sql`${studentProjects.delay_level} = 'Validé'`, eq(students.isDropout, false)))
        .execute(),
    ]);

    const totalStudents = totalStudentsResult[0]?.count || 0;
    const totalPromos = totalPromosResult[0]?.count || 0;
    const goodProgress = goodProgressResult[0]?.count || 0;
    const lateStudents = lateStudentsResult[0]?.count || 0;
    const validated = validatedResult[0]?.count || 0;
    const successRate = totalStudents > 0 ? Math.round((goodProgress / totalStudents) * 100) : 0;

    return apiSuccess({
      totalStudents,
      totalPromos,
      goodProgress,
      lateStudents,
      validated,
      successRate,
    });
  }),
);
