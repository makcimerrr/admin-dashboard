import { NextRequest, NextResponse } from 'next/server';
import { getStackSession } from '@/lib/stack-auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getStackSession();

    if (!session) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const role = session.user.server_metadata?.role ||
                session.user.client_read_only_metadata?.role ||
                session.user.client_metadata?.role ||
                'user';

    const response = NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.primary_email,
        name: session.user.display_name,
        image: session.user.profile_image_url,
        role,
        planningPermission: session.user.server_metadata?.planningPermission || 'reader',
      },
    });

    // Update role cookie to keep it in sync
    response.cookies.set('stack-role', role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Session error:', error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
