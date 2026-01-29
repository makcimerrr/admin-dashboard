import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${error}`, req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', req.url));
  }

  try {
    // Exchange code for tokens with Stack Auth
    const response = await fetch('https://api.stack-auth.com/api/v1/auth/oauth/callback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-stack-project-id': process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
        'x-stack-publishable-client-key': process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
      },
      body: JSON.stringify({
        code,
        state,
      }),
    });

    if (!response.ok) {
      throw new Error('OAuth callback failed');
    }

    const data = await response.json();

    // Set cookies
    const cookieStore = await cookies();
    cookieStore.set('stack-access-token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    if (data.refresh_token) {
      cookieStore.set('stack-refresh-token', data.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });
    }

    // Fetch user metadata to get role
    try {
      const userResponse = await fetch('https://api.stack-auth.com/api/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${data.access_token}`,
          'x-stack-project-id': process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
          'x-stack-publishable-client-key': process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
        },
      });

      if (userResponse.ok) {
        const user = await userResponse.json();
        const role = user.server_metadata?.role ||
                    user.client_read_only_metadata?.role ||
                    user.client_metadata?.role ||
                    'user';

        // Set role cookie for middleware
        cookieStore.set('stack-role', role, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7 days
          path: '/',
        });

        console.log('✅ OAuth callback - Role cookie set:', role);
      }
    } catch (roleError) {
      console.error('Failed to fetch user role:', roleError);
      // Continue even if role fetch fails - user will have default 'user' role in middleware
    }

    // Redirect to home
    return NextResponse.redirect(new URL('/', req.url));
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(new URL('/login?error=callback_failed', req.url));
  }
}
