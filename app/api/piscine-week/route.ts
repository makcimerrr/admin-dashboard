import { NextRequest, NextResponse } from 'next/server';
import { getPiscineWeek, setPiscineWeek } from '@/lib/db/services/planning';

export async function GET(req: NextRequest) {
  const weekKey = req.nextUrl.searchParams.get('weekKey');
  if (!weekKey) {
    return NextResponse.json({ error: 'Missing weekKey' }, { status: 400 });
  }
  const result = await getPiscineWeek(weekKey);
  return NextResponse.json({ weekKey, isPiscine: !!(result && result.isPiscine) });
}

export async function POST(req: NextRequest) {
  const { weekKey, isPiscine } = await req.json();
  if (!weekKey || typeof isPiscine !== 'boolean') {
    return NextResponse.json({ error: 'Missing or invalid parameters' }, { status: 400 });
  }
  await setPiscineWeek(weekKey, isPiscine);
  return NextResponse.json({ success: true });
}
