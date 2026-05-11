import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db/config';
import { students, studentProjects, promotions } from '@/lib/db/schema';
import { count, sql, eq, and, or, isNull } from 'drizzle-orm';
import { apiSuccess, withAuth, withErrorHandler } from '@/lib/api';
import { CACHE_TAGS, CACHE_TTL } from '@/lib/cache';

const computeOverview = unstable_cache(
  async () => {
    const [
      totalStudentsResult,
      totalPromosResult,
      goodProgressResult,
      lateStudentsResult,
      validatedResult,
    ] = await Promise.all([
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
      db
        .select({ count: count() })
        .from(promotions)
        .where(or(eq(promotions.isArchived, false), isNull(promotions.isArchived)))
        .execute(),
      db
        .select({ count: count() })
        .from(studentProjects)
        .innerJoin(students, eq(studentProjects.student_id, students.id))
        .where(and(sql`${studentProjects.delay_level} = 'bien'`, eq(students.isDropout, false)))
        .execute(),
      db
        .select({ count: count() })
        .from(studentProjects)
        .innerJoin(students, eq(studentProjects.student_id, students.id))
        .where(and(sql`${studentProjects.delay_level} = 'en retard'`, eq(students.isDropout, false)))
        .execute(),
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

    return { totalStudents, totalPromos, goodProgress, lateStudents, validated, successRate };
  },
  ['widgets-overview'],
  { tags: [CACHE_TAGS.widgetsOverview], revalidate: CACHE_TTL.medium },
);

export const GET = withErrorHandler(
  withAuth(async () => {
    const data = await computeOverview();
    return apiSuccess(data);
  }),
);
