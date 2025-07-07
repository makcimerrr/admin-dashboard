import { NextResponse } from 'next/server';
import { saveOauthUser, getUserRole } from '@/lib/db/services/users';
import { db } from '@/lib/db/config';
import { users } from '@/lib/db/schema/users';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  const body = await req.json();

  const email = body.email;
  const name = body.name;

  await saveOauthUser(email, name);

  // Récupérer le rôle ET la permission planning
  const user = await db
    .select({ role: users.role, planningPermission: users.planningPermission })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
    .then(res => res[0]);

  return NextResponse.json({ success: true, role: user?.role, planningPermission: user?.planningPermission }, { status: 200 });
}
