import { NextResponse } from 'next/server';
import { db } from '@/lib/db/config';
import { students, studentProjects } from '@/lib/db/schema';
import { eq, count, sql, and } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const promoKey = url.searchParams.get('promo');

    const delayLevels = ['bien', 'en retard', 'Validé', 'Non Validé'] as const;
    const delayData = [];

    for (const level of delayLevels) {
      let query = db
        .select({ count: count() })
        .from(studentProjects)
        .leftJoin(students, eq(studentProjects.student_id, students.id))
        .where(sql`${studentProjects.delay_level} = ${level}`);

      if (promoKey && promoKey !== 'all') {
        query = query.where(
          and(
            sql`${studentProjects.delay_level} = ${level}`,
            eq(students.promoName, promoKey)
          )
        ) as any;
      }

      const result = await query.execute();
      const count_value = result[0]?.count || 0;

      delayData.push({
        level,
        count: count_value,
      });
    }

    return NextResponse.json({ success: true, delayLevels: delayData });
  } catch (error) {
    console.error('Error fetching delay distribution:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch delay distribution data' },
      { status: 500 }
    );
  }
}
