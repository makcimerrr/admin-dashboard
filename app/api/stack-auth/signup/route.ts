import { NextRequest, NextResponse } from 'next/server';
import { signUpWithPassword } from '@/lib/stack-auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, displayName } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const session = await signUpWithPassword(email, password, displayName);

    // Create response with cookies
    const response = NextResponse.json({
      success: true,
      user: session.user,
    });

    // Set secure cookies
    response.cookies.set('stack-access-token', session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    if (session.refresh_token) {
      response.cookies.set('stack-refresh-token', session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });
    }

    return response;
  } catch (error: any) {
    console.error('Sign up error:', error);
    return NextResponse.json(
      { error: error.message || 'Sign up failed' },
      { status: 400 }
    );
  }
}
