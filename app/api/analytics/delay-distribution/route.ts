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
      // Toujours exclure les étudiants en perdition
      const conditions = [
        sql`${studentProjects.delay_level} = ${level}`,
        eq(students.isDropout, false)
      ];

      if (promoKey && promoKey !== 'all') {
        conditions.push(eq(students.promoName, promoKey));
      }

      const query = db
        .select({ count: count() })
        .from(studentProjects)
        .innerJoin(students, eq(studentProjects.student_id, students.id))
        .where(and(...conditions));

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
