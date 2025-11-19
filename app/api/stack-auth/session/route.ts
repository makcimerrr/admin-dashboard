import { NextRequest, NextResponse } from 'next/server';
import { getStackSession } from '@/lib/stack-auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getStackSession();

    if (!session) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.primary_email,
        name: session.user.display_name,
        image: session.user.profile_image_url,
        role: session.user.server_metadata?.role || 'user',
        planningPermission: session.user.server_metadata?.planningPermission || 'reader',
      },
    });
  } catch (error: any) {
    console.error('Session error:', error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
