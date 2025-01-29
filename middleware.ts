// middleware.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function middleware(request: { url: string | URL | undefined }) {
  const session = await auth();
  const user = session?.user;

  const loginUrl = new URL('/login', request.url);
  const registerUrl = new URL('/register', request.url);

  // Avoid redirect loop by checking if the request is already for the login page
  if (!user && request.url !== loginUrl.toString() && request.url !== registerUrl.toString()) {
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Don't invoke Middleware on some paths
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};