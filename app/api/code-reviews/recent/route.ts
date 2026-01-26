import { NextResponse } from 'next/server';
import { getRecentCodeReviews } from '@/lib/db/services/audits';

export async function GET() {
  const reviews = await getRecentCodeReviews(5);
  return NextResponse.json(reviews);
}
