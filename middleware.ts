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

/**
 * Résout le rôle de l'appelant (Stack Auth ou NextAuth/Authentik) côté Edge,
 * sans faire confiance au cookie non-httpOnly `role` (falsifiable). Renvoie
 * `null` si non authentifié. Utilisé pour garder les mutations exposées en API.
 */
async function resolveRole(req: NextRequest): Promise<string | null> {
  const cookies = req.cookies;
  const stackProjectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID;
  const stackAccessToken = cookies.get('stack-access') || cookies.get('stack-access-token');
  const stackAccessProject = cookies.get(`stack-access-${stackProjectId}--default`);
  const refreshCookie = cookies.get(`stack-refresh-${stackProjectId}--default`);
  const accessToken = stackAccessToken || stackAccessProject;

  if (accessToken || refreshCookie) {
    const stackRoleCookie = cookies.get('stack-role'); // httpOnly, posé par ce middleware
    if (stackRoleCookie && stackRoleCookie.value !== 'user') {
      return stackRoleCookie.value;
    }
    if (accessToken) {
      try {
        const r = await fetch('https://api.stack-auth.com/api/v1/users/me', {
          headers: {
            'Authorization': `Bearer ${accessToken.value}`,
            'x-stack-project-id': process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
            'x-stack-publishable-client-key': process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
          },
        });
        if (r.ok) {
          const u = await r.json();
          return (
            u.server_metadata?.role ||
            u.client_read_only_metadata?.role ||
            u.client_metadata?.role ||
            'user'
          );
        }
      } catch {
        // ignore
      }
    }
    return 'user'; // authentifié mais rôle indéterminé
  }

  const token = await getToken({
    req,
    secret: NEXTAUTH_SECRET,
    secureCookie: shouldUseSecureCookies(),
  });
  if (token) {
    if (Array.isArray(token.groups) && token.groups.includes('authentik Admins')) {
      return 'admin';
    }
    return 'user';
  }
  return null;
}

const ADMIN_ROLES = ['Admin', 'Super Admin', 'admin'];

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.pathname;

  // ========================================
  // 0a. PROXY DONNÉES ÉTUDIANTS (admin only, toutes méthodes)
  // ========================================
  // /api/zone01/* (ex. /api/zone01/external/[login]) renvoie des données
  // gitea/Zone01 par étudiant ; ces pages sont admin-only → on protège aussi le
  // proxy (sinon données exposées sans auth). GET inclus.
  if (url.startsWith('/api/zone01/')) {
    const role = await resolveRole(req);
    if (role === null) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
    }
    if (!ADMIN_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });
    }
    return NextResponse.next();
  }

  // ========================================
  // 0. MUTATIONS DE CONFIG EXPOSÉES EN API
  // ========================================
  // Le matcher exclut /api : ces routes de config n'auraient sinon AUCUNE garde
  // (mutations DB ouvertes). On gate uniquement les écritures ; les GET restent
  // ouverts (lecture utilisée par d'autres pages). Réponse JSON, pas de redirect.
  const protectedApiConfig = ['/api/projects', '/api/holidays'];
  if (protectedApiConfig.some((p) => url === p || url.startsWith(p + '/'))) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return NextResponse.next();
    }
    const role = await resolveRole(req);
    if (role === null) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
    }
    if (!ADMIN_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });
    }
    return NextResponse.next();
  }

  // ========================================
  // 1. ROUTES PUBLIQUES (pas d'auth requise)
  // ========================================
  const publicRoutes = [
    '/login', // Page de connexion
    '/register', // Page d'inscription
    '/handler', // Stack Auth handlers
    '/hub' // Hub public
  ];

  if (publicRoutes.some((route) => url.startsWith(route))) {
    return NextResponse.next();
  }

  // ========================================
  // 1.5 ROUTES ADMIN-ONLY
  // ========================================
  // Routes accessible only to Admin / Super Admin users. Non-admins are
  // redirected to /. Keep in sync with adminOnly flags in lib/nav-apps.ts
  const adminOnlyPrefixes = [
    '/students',
    '/alternants',
    '/specialties',
    '/code-reviews',
    '/promos',
    '/analytics',
    '/planning',
    '/employees',
    '/history',
    '/01deck',
    '/word_assistant',
    '/config',
    '/assistant',
  ];
  const isAdminPath = adminOnlyPrefixes.some((p) => url === p || url.startsWith(p + '/'));

  const enforceAdminGuard = (role: string) => {
    if (isAdminPath && role !== 'Admin' && role !== 'Super Admin' && role !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return null;
  };

  // ========================================
  // 2. VERIFICATION STACK AUTH
  // ========================================
  const cookies = req.cookies;
  const stackProjectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID;

  // Stack Auth peut utiliser plusieurs formats de cookies
  // Accept multiple possible cookie names observed in different environments
  const stackAccessToken = cookies.get('stack-access') || cookies.get('stack-access-token');
  const stackAccessProject = cookies.get(`stack-access-${stackProjectId}--default`);
  const refreshCookieName = `stack-refresh-${stackProjectId}--default`;
  const refreshCookie = cookies.get(refreshCookieName);

  // Utiliser l'access token disponible (project-specific ou global)
  const accessToken = stackAccessToken || stackAccessProject;

  if (accessToken || refreshCookie) {
    const stackRoleCookie = cookies.get('stack-role');
    const shouldRefreshRole = !stackRoleCookie || stackRoleCookie.value === 'user';

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

          const blocked = enforceAdminGuard(role);
          if (blocked) return blocked;

          const response = NextResponse.next();

          // Créer/mettre à jour le cookie stack-role
          response.cookies.set('stack-role', role, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
          });

          // ⚠️ Cookie `role` UI-ONLY (volontairement NON httpOnly).
          // Il sert uniquement à l'affichage côté Server/Client Components ;
          // il N'EST JAMAIS source de vérité pour une décision d'autorisation.
          // L'autorisation serveur s'appuie sur stackServerApp.getUser() /
          // getServerSession(), et le gating Edge sur resolveRole() (qui ne fait
          // confiance qu'au cookie httpOnly `stack-role`, re-validé via Stack Auth).
          // Ne PAS le passer en httpOnly (casserait l'UI).
          response.cookies.set('role', role, { path: '/' });

          /*if (stackRoleCookie && stackRoleCookie.value !== role) {
            console.log(`🔄 Middleware - Cookie stack-role mis à jour: ${stackRoleCookie.value} → ${role} pour ${url}`);
          } else {
            console.log(`✅ Middleware - Cookie stack-role créé: ${role} pour ${url}`);
          }*/

          return response;
        }
      } catch (fetchError) {
        console.error('❌ Middleware - Erreur fetch Stack Auth:', fetchError);
      }
    }

    // Cookie stack-role présent, utiliser sa valeur
    if (stackRoleCookie) {
      const role = stackRoleCookie.value;
      const blocked = enforceAdminGuard(role);
      if (blocked) return blocked;
      const response = NextResponse.next();
      response.cookies.set('role', role, { path: '/' });
      return response;
    }

    // Pas de stack-role et pas d'access token → délégation au Server Component
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

  if (token) {
    // Si l'utilisateur est dans le groupe "authentik Admins", rôle = admin
    let role = 'user';
    if (
      Array.isArray(token.groups) &&
      token.groups.includes('authentik Admins')
    ) {
      role = 'admin';
    }

    const blocked = enforceAdminGuard(role);
    if (blocked) return blocked;

    const response = NextResponse.next();
    response.cookies.set('role', role, { path: '/' }); // Expose le rôle pour Server Components
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
    '/((?!api|_next/static|_next/image|favicon.ico|icon.svg).*)',
    // Exceptions : on inclut explicitement les mutations de config exposées en API
    '/api/projects/:path*',
    '/api/holidays/:path*',
    '/api/zone01/:path*'
  ]
};
