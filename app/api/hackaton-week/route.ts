import { NextRequest, NextResponse } from 'next/server';
import { getHackatonWeek, setHackatonWeek } from '@/lib/db/services/planning';

export async function GET(req: NextRequest) {
  const weekKey = req.nextUrl.searchParams.get('weekKey');
  if (!weekKey) {
    return NextResponse.json({ error: 'Missing weekKey' }, { status: 400 });
  }
  const result = await getHackatonWeek(weekKey);
  return NextResponse.json({ weekKey, isHackaton: !!(result && result.isHackaton) });
}

export async function POST(req: NextRequest) {
  const { weekKey, isHackaton } = await req.json();
  if (!weekKey || typeof isHackaton !== 'boolean') {
    return NextResponse.json({ error: 'Missing or invalid parameters' }, { status: 400 });
  }
  await setHackatonWeek(weekKey, isHackaton);
  return NextResponse.json({ success: true });
} 