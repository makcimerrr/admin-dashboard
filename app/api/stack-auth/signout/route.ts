import { NextRequest, NextResponse } from 'next/server';
import { signOut } from '@/lib/stack-auth';

export async function POST(req: NextRequest) {
  try {
    await signOut();

    const response = NextResponse.json({ success: true });

    // Clear cookies
    response.cookies.delete('stack-access-token');
    response.cookies.delete('stack-refresh-token');

    return response;
  } catch (error: any) {
    console.error('Sign out error:', error);
    return NextResponse.json(
      { error: error.message || 'Sign out failed' },
      { status: 500 }
    );
  }
}
