import { NextResponse } from 'next/server';

const ZONE01_API = 'https://api-zone01-rouen.deno.dev/api/v1';

/**
 * GET /api/specialties
 * Proxy vers l'API zone01 — liste toutes les spécialités.
 */
export async function GET() {
  try {
    const res = await fetch(`${ZONE01_API}/specialties`, {
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
    console.error('Error fetching specialties:', error);
    return NextResponse.json(
      { error: 'Failed to fetch specialties' },
      { status: 500 }
    );
  }
}
