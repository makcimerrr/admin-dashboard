import { NextResponse } from 'next/server';
import { db } from '@/lib/db/config';
import { students, studentSpecialtyProgress } from '@/lib/db/schema';
import { eq, count, and } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const promoKey = url.searchParams.get('promo');

    const tracks = ['golang', 'javascript', 'rust', 'java'] as const;
    const trackData = [];

    for (const track of tracks) {
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

      // Build base query - exclure les perditions
      const baseConditions = [
        eq(completedColumn, true),
        eq(students.isDropout, false)
      ];

      if (promoKey && promoKey !== 'all') {
        baseConditions.push(eq(students.promoName, promoKey));
      }

      const completedQuery = await db
        .select({ count: count() })
        .from(students)
        .leftJoin(studentSpecialtyProgress, eq(students.id, studentSpecialtyProgress.student_id))
        .where(and(...baseConditions))
        .execute();

      const completed = completedQuery[0]?.count || 0;

      // Get total students for the promo (exclure les perditions)
      const totalConditions = [eq(students.isDropout, false)];
      if (promoKey && promoKey !== 'all') {
        totalConditions.push(eq(students.promoName, promoKey));
      }

      const totalResult = await db
        .select({ count: count() })
        .from(students)
        .where(and(...totalConditions))
        .execute();

      const total = totalResult[0]?.count || 0;

      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      trackData.push({
        track: track.charAt(0).toUpperCase() + track.slice(1),
        completed,
        total,
        percentage,
      });
    }

    return NextResponse.json({ success: true, tracks: trackData });
  } catch (error) {
    console.error('Error fetching track comparison:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch track comparison data' },
      { status: 500 }
    );
  }
}
