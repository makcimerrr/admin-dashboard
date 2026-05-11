import { NextResponse } from 'next/server';
import { db } from '@/lib/db/config';
import { students, studentProjects, promotions } from '@/lib/db/schema';
import { eq, count, sql } from 'drizzle-orm';
import { countableStudentsWhere } from '@/lib/db/filters';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const promoKey = url.searchParams.get('promo');

    const delayLevels = ['bien', 'en retard', 'Validé', 'Non Validé'] as const;
    const delayData = await Promise.all(
      delayLevels.map(async (level) => {
        const extra = promoKey && promoKey !== 'all'
          ? [eq(students.promoName, promoKey)]
          : [];

        const result = await db
          .select({ count: count() })
          .from(studentProjects)
          .innerJoin(students, eq(studentProjects.student_id, students.id))
          .innerJoin(promotions, eq(students.promoName, promotions.name))
          .where(countableStudentsWhere(sql`${studentProjects.delay_level} = ${level}`, ...extra))
          .execute();

        return { level, count: result[0]?.count || 0 };
      }),
    );

    return NextResponse.json({ success: true, delayLevels: delayData });
  } catch (error) {
    console.error('Error fetching delay distribution:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch delay distribution data' },
      { status: 500 }
    );
  }
}
