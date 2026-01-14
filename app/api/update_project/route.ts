import { NextResponse } from 'next/server';
import { updateStudentProject } from '@/lib/db/services/students'; // Assuming this is where your function lives

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Received data in /api/update_project:', body);

    const { login, project_name, project_status, delay_level, last_projects_finished, common_projects, promo_name } = body;

    // Call the function to update the project status
    await updateStudentProject(
      login,
      project_name,
      project_status,
      delay_level,
      last_projects_finished,
      common_projects,
      promo_name
    );

    return NextResponse.json({ message: 'Project updated successfully' });
  } catch (error) {
    console.error('Error updating student project:', error);
    return NextResponse.json({ message: 'Error updating project' }, { status: 500 });
  }
}