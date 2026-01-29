import { NextRequest, NextResponse } from 'next/server';
import { signOut } from '@/lib/stack-auth';

export async function POST(req: NextRequest) {
  try {
    await signOut();

    const response = NextResponse.json({ success: true });

    // Clear Stack Auth cookies
    response.cookies.delete('stack-access-token');
    response.cookies.delete('stack-refresh-token');
    response.cookies.delete('stack-role');

    // Clear Stack Auth project-specific cookies
    const stackProjectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID;
    if (stackProjectId) {
      response.cookies.delete(`stack-access-${stackProjectId}--default`);
      response.cookies.delete(`stack-refresh-${stackProjectId}--default`);
    }

    // Clear NextAuth cookies (for Authentik SSO)
    response.cookies.delete('next-auth.session-token');
    response.cookies.delete('__Secure-next-auth.session-token');
    response.cookies.delete('next-auth.callback-url');
    response.cookies.delete('__Secure-next-auth.callback-url');
    response.cookies.delete('next-auth.csrf-token');
    response.cookies.delete('__Secure-next-auth.csrf-token');

    // Clear role cookie
    response.cookies.delete('role');

    console.log('✅ All auth cookies cleared');

    return response;
  } catch (error: any) {
    console.error('Sign out error:', error);
    return NextResponse.json(
      { error: error.message || 'Sign out failed' },
      { status: 500 }
    );
  }
}
