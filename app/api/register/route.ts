import { NextResponse } from 'next/server';
import { createUserInDb } from '@/lib/db';

const registerAttempts = new Map<string, { count: number, lastAttempt: number }>();
const RATE_LIMIT = 5; // Max attempts
const TIME_FRAME = 60 * 1000; // 1 minute

export async function POST(req: Request) {
  try {
    const { name, email, password, confirmPassword } = await req.json();

    if (!name || !email || !password || !confirmPassword) {
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ message: 'Passwords do not match' }, { status: 400 });
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ message: 'Invalid email format' }, { status: 400 });
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json({
        message: 'Password must be at least 8 characters long, contain one uppercase letter, one number, and one special character.',
      }, { status: 400 });
    }

    // Protection contre les inscriptions abusives
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('remoteAddress');

    if (!ip) {
      return NextResponse.json({ message: 'Unable to determine IP address' }, { status: 400 });
    }

    const currentAttempt = registerAttempts.get(ip) || { count: 0, lastAttempt: Date.now() };

    if (currentAttempt.count >= RATE_LIMIT && Date.now() - currentAttempt.lastAttempt < TIME_FRAME) {
      return NextResponse.json({ message: 'Too many attempts. Please try again later.' }, { status: 429 });
    }

    // Appel à la DB pour la création du compte
    const user = await createUserInDb({ name, email, password });

    if (!user) {
      return NextResponse.json({ message: 'An error occurred. Please try again later.' }, { status: 500 });
    }

    // Réinitialiser les tentatives sur succès
    registerAttempts.delete(ip);

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error in registration:', error);

    return NextResponse.json({ message: 'Error creating user' }, { status: 500 });
  }
}