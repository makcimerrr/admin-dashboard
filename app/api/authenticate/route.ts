import { NextResponse } from 'next/server';
import { getUserFromDb } from '@/lib/db/services/users';

const loginAttempts = new Map<string, { count: number, lastAttempt: number, blockUntil: number | null }>();
const RATE_LIMIT = 5; // Max number of attempts
const TIME_FRAME = 60 * 1000; // 1 minute in milliseconds
const BLOCK_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds for IP blocking

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
  }

  // Récupérer l'IP du client via l'en-tête x-forwarded-for
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('remoteAddress');

  if (!ip) {
    return NextResponse.json({ message: 'Unable to determine IP address' }, { status: 400 });
  }

  // Check if IP is temporarily blocked
  const currentAttempt = loginAttempts.get(ip) || { count: 0, lastAttempt: Date.now(), blockUntil: null };

  if (currentAttempt.blockUntil && Date.now() < currentAttempt.blockUntil) {
    const timeLeft = Math.ceil((currentAttempt.blockUntil - Date.now()) / 1000);
    return NextResponse.json({ message: `Too many login attempts. Please try again in ${timeLeft} seconds.` }, { status: 429 });
  }

  // Rate limit check
  if (currentAttempt.count >= RATE_LIMIT && Date.now() - currentAttempt.lastAttempt < TIME_FRAME) {
    // Temporarily block the IP for 15 minutes after 5 failed attempts
    currentAttempt.blockUntil = Date.now() + BLOCK_TIME;
    loginAttempts.set(ip, currentAttempt);
    return NextResponse.json({ message: 'Too many login attempts. Please try again later.' }, { status: 429 });
  }

  try {
    const user = await getUserFromDb(email, password);

    // Reset the counter on successful login
    if (user) {
      loginAttempts.delete(ip); // Success, reset attempts
      return NextResponse.json(user, { status: 200 });
    } else {
      // Increment login attempt counter on failure
      if (Date.now() - currentAttempt.lastAttempt > TIME_FRAME) {
        currentAttempt.count = 0; // Reset if more than 1 minute passed
      }
      currentAttempt.count += 1;
      currentAttempt.lastAttempt = Date.now();
      loginAttempts.set(ip, currentAttempt);

      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error in authentication API:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}