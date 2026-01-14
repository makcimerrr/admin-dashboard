import { NextResponse } from 'next/server';
import { getProjectProgressStats } from '@/lib/db/services/students';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const promo = url.searchParams.get('promo');
    const projectJson = url.searchParams.get('project');

    if (!promo || !projectJson) {
      return NextResponse.json(
        { error: 'Missing promo or project parameter' },
        { status: 400 }
      );
    }

    let project: string | { rust?: string; java?: string };
    try {
      project = JSON.parse(projectJson);
    } catch {
      project = projectJson;
    }

    const stats = await getProjectProgressStats(promo, project);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error retrieving project progress stats:', error);
    return NextResponse.json(
      { error: 'Error retrieving project progress stats' },
      { status: 500 }
    );
  }
}
