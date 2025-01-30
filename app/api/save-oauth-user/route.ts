import { NextResponse } from 'next/server';
import { saveOauthUser } from '@/lib/db';

export async function POST(req: Request) {
  const body = await req.json();

  const email = body.email;
  const name = body.name;

  await saveOauthUser(email, name);

  return NextResponse.json({ success: true }, { status: 200 });
}
