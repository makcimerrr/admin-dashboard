import { type NextRequest, NextResponse } from 'next/server';

const ZONE01_API = 'https://api-zone01-rouen.deno.dev/api/v1';

/**
 * GET /api/specialties/:name/students?eventId=XX
 * Proxy vers l'API zone01 — étudiants d'une spécialité.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const eventId = request.nextUrl.searchParams.get('eventId');

    let url = `${ZONE01_API}/specialties/${encodeURIComponent(name)}/students`;
    if (eventId) url += `?eventId=${encodeURIComponent(eventId)}`;

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Zone01 API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching specialty students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch specialty students' },
      { status: 500 }
    );
  }
}
