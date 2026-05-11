import { NextResponse } from 'next/server';
import { db } from '@/lib/db/config';
import { students, studentSpecialtyProgress, promotions } from '@/lib/db/schema';
import { eq, count } from 'drizzle-orm';
import { countableStudentsWhere } from '@/lib/db/filters';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const promoKey = url.searchParams.get('promo');
    const promoFilter = promoKey && promoKey !== 'all' ? [eq(students.promoName, promoKey)] : [];

    const tracks = ['golang', 'javascript', 'rust', 'java'] as const;
    const cols = {
      golang: studentSpecialtyProgress.golang_completed,
      javascript: studentSpecialtyProgress.javascript_completed,
      rust: studentSpecialtyProgress.rust_completed,
      java: studentSpecialtyProgress.java_completed,
    };

    // One total query (countable students for the promo filter)
    const totalQuery = await db
      .select({ count: count() })
      .from(students)
      .innerJoin(promotions, eq(students.promoName, promotions.name))
      .where(countableStudentsWhere(...promoFilter))
      .execute();
    const total = totalQuery[0]?.count || 0;

    // One query per track for completed count
    const trackData = await Promise.all(
      tracks.map(async (track) => {
        const completedQuery = await db
          .select({ count: count() })
          .from(students)
          .leftJoin(studentSpecialtyProgress, eq(students.id, studentSpecialtyProgress.student_id))
          .innerJoin(promotions, eq(students.promoName, promotions.name))
          .where(countableStudentsWhere(eq(cols[track], true), ...promoFilter))
          .execute();

        const completed = completedQuery[0]?.count || 0;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
          track: track.charAt(0).toUpperCase() + track.slice(1),
          completed,
          total,
          percentage,
        };
      }),
    );

    return NextResponse.json({ success: true, tracks: trackData });
  } catch (error) {
    console.error('Error fetching track comparison:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch track comparison data' },
      { status: 500 }
    );
  }
}
