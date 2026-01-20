import { NextResponse, NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Middleware hybride pour Stack Auth + Authentik via NextAuth
 *
 * STRATÉGIE D'AUTHENTIFICATION :
 *
 * 1. Vérification des cookies Stack Auth (Edge Runtime)
 *    - Rapide mais limité : ne contient que l'accès rapide
 *    - Redirige vers /login si aucun cookie trouvé
 *
 * 2. Vérification NextAuth / Authentik (Edge Runtime)
 *    - Vérifie le JWT généré par NextAuth
 *    - Attribue un rôle admin si l'utilisateur fait partie du groupe "authentik Admins"
 *    - Permet d'utiliser Authentik SSO côté Edge
 *
 * 3. Server Components (Node Runtime)
 *    - Vérification complète côté serveur via Stack Auth ou NextAuth
 *    - Protection finale des layouts (ex: app/(dashboard)/layout.tsx)
 *
 * Cette approche à deux niveaux garantit :
 * - Performance (Edge Runtime pour vérifications rapides)
 * - Sécurité (Server Components pour vérifications complètes)
 * - Compatibilité avec Stack Auth et Authentik
 */

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.pathname;

  // ========================================
  // 1. ROUTES PUBLIQUES (pas d'auth requise)
  // ========================================
  const publicRoutes = [
    '/login', // Page de connexion
    '/register', // Page d'inscription
    '/non-admin', // Page d'accès refusé
    '/handler', // Stack Auth handlers
    '/hub' // Hub public
  ];

  if (publicRoutes.some((route) => url.startsWith(route))) {
    return NextResponse.next();
  }

  // ========================================
  // 2. VERIFICATION STACK AUTH
  // ========================================
  const cookies = req.cookies;
  const stackAccessCookie = cookies.get('stack-access');
  const refreshCookieName = `stack-refresh-${process.env.NEXT_PUBLIC_STACK_PROJECT_ID}--default`;
  const refreshCookie = cookies.get(refreshCookieName);

  if (stackAccessCookie || refreshCookie) {
    // Récupération du rôle Stack (si présent, sinon 'user')
    const role = cookies.get('stack-role') || 'user';
    const response = NextResponse.next();
    response.cookies.set('role', role, { path: '/' }); // Permet d'exposer le rôle côté Server Component
    console.log('✅ Middleware - Auth Stack trouvée pour:', url, 'Rôle:', role);
    return response;
  }

  // ========================================
  // 3. VERIFICATION NEXTAUTH / AUTHENTIK
  // ========================================
  const token = await getToken({
    req,
    secret: NEXTAUTH_SECRET,
    secureCookie: process.env.NODE_ENV === 'production'
  });

  if (token) {
    // Si l'utilisateur est dans le groupe "authentik Admins", rôle = admin
    let role = 'user';
    if (
      Array.isArray(token.groups) &&
      token.groups.includes('authentik Admins')
    ) {
      role = 'admin';
    }

    const response = NextResponse.next();
    response.cookies.set('role', role, { path: '/' }); // Expose le rôle pour Server Components
    console.log(
      '✅ Middleware - Auth NextAuth/Authentik trouvée pour:',
      url,
      'Rôle:',
      role
    );
    return response;
  }

  // ========================================
  // 4. PAS D'AUTHENTIFICATION => REDIRECTION LOGIN
  // ========================================
  console.log('⛔ Middleware - Aucun cookie Stack/Auth NextAuth pour:', url);
  return NextResponse.redirect(new URL('/login', req.url));
}

export const config = {
  matcher: [
    // Protéger toutes les routes sauf les fichiers statiques et API
    '/((?!api|_next/static|_next/image|favicon.ico).*)'
  ]
};
