import { NextResponse } from 'next/server';
import { getProjectProgressStats } from '@/lib/db/services/students';
import { getArchivedPromoNames } from '@/lib/db/filters';

const EMPTY_STATS = {
  totalStudents: 0,
  onExpectedProject: 0,
  percentage: 0,
  offProjectStats: {
    ahead: 0,
    late: 0,
    specialty: 0,
    validated: 0,
    notValidated: 0,
    other: 0,
  },
};

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

    // Archived promos return empty stats — they should never count in dashboards.
    const archived = await getArchivedPromoNames();
    if (archived.has(promo)) {
      return NextResponse.json(EMPTY_STATS);
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
