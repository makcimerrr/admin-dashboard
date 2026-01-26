import { NextResponse } from 'next/server';
import { getUrgentCodeReviews } from '@/lib/db/services/audits';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const promoId = searchParams.get('promoId') ?? undefined;
  const projectName = searchParams.get('projectName') ?? undefined;

  const reviews = await getUrgentCodeReviews(promoId, projectName, 5);
  return NextResponse.json(reviews);
}
