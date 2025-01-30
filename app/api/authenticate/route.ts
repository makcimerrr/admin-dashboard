import { NextResponse } from 'next/server';
import { getUserFromDb } from '@/lib/db';

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
  }

  try {
    const user = await getUserFromDb(email, password);
    if (user) {
      return NextResponse.json(user, { status: 200 });
    } else {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error in authentication API:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
