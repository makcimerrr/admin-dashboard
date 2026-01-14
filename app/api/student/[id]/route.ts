import { NextResponse } from 'next/server';
import { db } from '@/lib/db/config';
import { students, studentProjects, studentSpecialtyProgress, studentCurrentProjects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: Request,
  context: any
) {
  const params = await context.params;
  try {
    const studentId = parseInt(params.id);

    if (isNaN(studentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid student ID' },
        { status: 400 }
      );
    }

    // Get complete student info with all joins
    const studentResult = await db
      .select({
        id: students.id,
        last_name: students.last_name,
        first_name: students.first_name,
        login: students.login,
        promoName: students.promoName,
        availableAt: students.availableAt,
        actual_project_name: studentProjects.project_name,
        progress_status: studentProjects.progress_status,
        delay_level: studentProjects.delay_level,
        golang_project: studentCurrentProjects.golang_project,
        golang_project_status: studentCurrentProjects.golang_project_status,
        javascript_project: studentCurrentProjects.javascript_project,
        javascript_project_status: studentCurrentProjects.javascript_project_status,
        rust_project: studentCurrentProjects.rust_project,
        rust_project_status: studentCurrentProjects.rust_project_status,
        java_project: studentCurrentProjects.java_project,
        java_project_status: studentCurrentProjects.java_project_status,
        golang_completed: studentSpecialtyProgress.golang_completed,
        javascript_completed: studentSpecialtyProgress.javascript_completed,
        rust_completed: studentSpecialtyProgress.rust_completed,
        java_completed: studentSpecialtyProgress.java_completed
      })
      .from(students)
      .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
      .leftJoin(studentCurrentProjects, eq(students.id, studentCurrentProjects.student_id))
      .leftJoin(studentSpecialtyProgress, eq(students.id, studentSpecialtyProgress.student_id))
      .where(eq(students.id, studentId))
      .execute();

    if (studentResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    const student = studentResult[0];

    // Get all projects for history
    const projects = await db
      .select()
      .from(studentProjects)
      .where(eq(studentProjects.student_id, studentId))
      .execute();

    return NextResponse.json({
      success: true,
      student,
      projects,
    });
  } catch (error) {
    console.error('Error fetching student details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch student details' },
      { status: 500 }
    );
  }
}
