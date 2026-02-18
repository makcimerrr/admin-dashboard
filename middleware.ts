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

function shouldUseSecureCookies() {
  try {
    if (process.env.NEXTAUTH_URL) {
      const url = new URL(process.env.NEXTAUTH_URL);
      return url.protocol === 'https:';
    }
  } catch (e) {
    // ignore and fallback
  }
  return process.env.NODE_ENV === 'production';
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.pathname;

  // Debug: lister les noms de cookies présents dans l'en-tête Cookie (ne pas afficher les valeurs)
  try {
    const cookieHeader = req.headers.get('cookie');
    const cookieNames = cookieHeader
      ? cookieHeader.split(';').map((c) => c.split('=')[0].trim()).filter(Boolean)
      : [];
    console.log('🧾 Middleware - cookies names for', url, ':', cookieNames);
    console.log('🌐 Middleware - host header for', url, ':', req.headers.get('host'));
  } catch (e) {
    // Ignore logging failure
  }

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
  const stackProjectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID;

  // Stack Auth peut utiliser plusieurs formats de cookies
  const stackAccessToken = cookies.get('stack-access-token');
  const stackAccessProject = cookies.get(`stack-access-${stackProjectId}--default`);
  const refreshCookieName = `stack-refresh-${stackProjectId}--default`;
  const refreshCookie = cookies.get(refreshCookieName);

  // Utiliser l'access token disponible (project-specific ou global)
  const accessToken = stackAccessToken || stackAccessProject;

  if (accessToken || refreshCookie) {
    const stackRoleCookie = cookies.get('stack-role');
    const shouldRefreshRole = !stackRoleCookie || stackRoleCookie.value === 'user';

    console.log('🔍 Middleware - Stack Auth détectée:', {
      accessToken: !!accessToken,
      refreshToken: !!refreshCookie,
      stackRole: stackRoleCookie?.value || 'absent',
      shouldRefresh: shouldRefreshRole
    });

    // Si le cookie stack-role est absent ou "user", récupérer le rôle depuis Stack Auth
    if (shouldRefreshRole && accessToken) {
      try {
        const userResponse = await fetch('https://api.stack-auth.com/api/v1/users/me', {
          headers: {
            'Authorization': `Bearer ${accessToken.value}`,
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

          const response = NextResponse.next();

          // Créer/mettre à jour le cookie stack-role
          response.cookies.set('stack-role', role, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
          });

          response.cookies.set('role', role, { path: '/' });

          if (stackRoleCookie && stackRoleCookie.value !== role) {
            console.log(`🔄 Middleware - Cookie stack-role mis à jour: ${stackRoleCookie.value} → ${role} pour ${url}`);
          } else {
            console.log(`✅ Middleware - Cookie stack-role créé: ${role} pour ${url}`);
          }

          return response;
        }
      } catch (fetchError) {
        console.error('❌ Middleware - Erreur fetch Stack Auth:', fetchError);
      }
    }

    // Cookie stack-role présent, utiliser sa valeur
    if (stackRoleCookie) {
      const role = stackRoleCookie.value;
      const response = NextResponse.next();
      response.cookies.set('role', role, { path: '/' });
      console.log(`✅ Middleware - Stack Auth OK pour ${url} - Rôle: ${role}`);
      return response;
    }

    // Pas de stack-role et pas d'access token pour le créer
    // Laisser le Server Component gérer l'authentification complète
    console.log(`⚠️  Middleware - Pas d'access token pour ${url}, délégation au Server Component`);
    return NextResponse.next();
  }

  // ========================================
  // 3. VERIFICATION NEXTAUTH / AUTHENTIK
  // ========================================
  const token = await getToken({
    req,
    secret: NEXTAUTH_SECRET,
    secureCookie: shouldUseSecureCookies(),
  });

  // Debug: afficher le token pour faciliter le diagnostic en production
  console.log('🔐 Middleware - getToken result for', url, ':', token ? { hasToken: true, groups: token.groups } : { hasToken: false });

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
