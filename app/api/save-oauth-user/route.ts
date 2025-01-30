import { NextResponse } from 'next/server';
import { saveOauthUser, getUserRole } from '@/lib/db';

export async function POST(req: Request) {
  const body = await req.json();

  const email = body.email;
  const name = body.name;

  await saveOauthUser(email, name);

  const role = await getUserRole(email);

  return NextResponse.json({ success: true, role: role }, { status: 200 });
}
