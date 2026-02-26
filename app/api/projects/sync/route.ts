import { NextResponse } from 'next/server';
import { getAllProjects } from '@/lib/db/services/projects';

/**
 * POST /api/projects/sync
 *
 * Projects are now managed directly in the DB.
 * This endpoint is kept for backwards compatibility but simply returns current DB state.
 */
export async function POST() {
  try {
    const rows = await getAllProjects();
    return NextResponse.json({
      success: true,
      message: 'Projects are managed directly in the DB. No sync needed.',
      results: { total: rows.length },
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/sync
 */
export async function GET() {
  try {
    const rows = await getAllProjects();
    return NextResponse.json({
      success: true,
      message: 'Projects are managed directly in the DB.',
      total: rows.length,
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}
