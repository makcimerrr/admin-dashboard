import { NextResponse } from 'next/server';
import { getUrgentCodeReviews } from '@/lib/db/services/audits';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const promoId = searchParams.get('promoId') ?? undefined;
    const projectName = searchParams.get('projectName') ?? undefined;

    const reviews = await getUrgentCodeReviews(promoId, projectName, 10);
    return NextResponse.json(reviews);
  } catch (error) {
    console.error('Error fetching urgent reviews:', error);
    return NextResponse.json([], { status: 200 });
  }
}
