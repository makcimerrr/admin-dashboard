import { NextResponse } from 'next/server';
import { db } from '@/lib/db/config';
import { students, studentProjects, promotions } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { countableStudentsWhere } from '@/lib/db/filters';

export async function GET() {
  try {
    const recentActivities = await db
      .select({
        studentId: students.id,
        firstName: students.first_name,
        lastName: students.last_name,
        promoName: students.promoName,
        projectName: studentProjects.project_name,
        progressStatus: studentProjects.progress_status,
        delayLevel: studentProjects.delay_level,
      })
      .from(students)
      .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
      .innerJoin(promotions, eq(students.promoName, promotions.name))
      .where(countableStudentsWhere())
      .orderBy(desc(students.availableAt))
      .limit(10)
      .execute();

    return NextResponse.json({
      success: true,
      activities: recentActivities.map((activity) => ({
        id: activity.studentId,
        studentName: `${activity.firstName} ${activity.lastName}`,
        promo: activity.promoName,
        project: activity.projectName,
        status: activity.progressStatus,
        delayLevel: activity.delayLevel,
      })),
    });
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}
