import { NextRequest, NextResponse } from 'next/server';
import { signInWithPassword } from '@/lib/stack-auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const session = await signInWithPassword(email, password);

    // Extract role from user metadata
    const role = session.user.server_metadata?.role ||
                session.user.client_read_only_metadata?.role ||
                session.user.client_metadata?.role ||
                'user';

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

    // Set role cookie for middleware
    response.cookies.set('stack-role', role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    console.log('✅ Sign in - Role cookie set:', role);

    return response;
  } catch (error: any) {
    console.error('Sign in error:', error);
    return NextResponse.json(
      { error: error.message || 'Sign in failed' },
      { status: 401 }
    );
  }
}
