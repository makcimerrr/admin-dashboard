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

      // Build base query
      let baseQuery = db
        .select({ count: count() })
        .from(students)
        .leftJoin(studentSpecialtyProgress, eq(students.id, studentSpecialtyProgress.student_id));

      // Add promo filter if specified
      if (promoKey && promoKey !== 'all') {
        baseQuery = baseQuery.where(
          and(
            eq(students.promoName, promoKey),
            eq(completedColumn, true)
          )
        ) as any;
      } else {
        baseQuery = baseQuery.where(eq(completedColumn, true)) as any;
      }

      const completedQuery = await baseQuery.execute();
      const completed = completedQuery[0]?.count || 0;

      // Get total students for the promo
      let totalQuery = db.select({ count: count() }).from(students);
      if (promoKey && promoKey !== 'all') {
        totalQuery = totalQuery.where(eq(students.promoName, promoKey)) as any;
      }
      const totalResult = await totalQuery.execute();
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
