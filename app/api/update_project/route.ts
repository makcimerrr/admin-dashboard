import { NextResponse } from 'next/server';
import { updateStudentProject } from '@/lib/db'; // Assuming this is where your function lives

export async function POST(req: Request) {
  try {
    const { login, project_name, project_status } = await req.json();

    // Call the function to update the project status
    await updateStudentProject(login, project_name, project_status);

    return NextResponse.json({ message: 'Project updated successfully' });
  } catch (error) {
    console.error('Error updating student project:', error);
    return NextResponse.json({ message: 'Error updating project' }, { status: 500 });
  }
}