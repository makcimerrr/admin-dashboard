import { NextResponse } from 'next/server';

import { ZONE01_API_BASE as ZONE01_API } from '@/lib/config/zone01-api';

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
