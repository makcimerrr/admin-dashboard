import { NextResponse, NextRequest } from "next/server";

/**
 * Middleware hybride pour Stack Auth
 *
 * STRATÉGIE D'AUTHENTIFICATION :
 *
 * 1. Le middleware (Edge Runtime) vérifie la présence des cookies Stack Auth
 *    - Rapide mais limité (pas d'accès complet aux métadonnées)
 *    - Redirige vers /login si aucun cookie trouvé
 *
 * 2. Les Server Components (Node Runtime) vérifient l'authentification complète
 *    - Accès complet au SDK Stack Auth
 *    - Vérification du rôle et des permissions
 *    - Protection finale dans les layouts (app/(dashboard)/layout.tsx)
 *
 * Cette approche à deux niveaux garantit :
 * - Performance (Edge Runtime pour vérifications rapides)
 * - Sécurité (Server Components pour vérifications complètes)
 * - Compatibilité (Stack Auth fonctionne mieux dans Node Runtime)
 */

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.pathname;

  // ========================================
  // 1. ROUTES PUBLIQUES (pas d'auth requise)
  // ========================================
  const publicRoutes = [
    '/login',           // Page de connexion
    '/register',        // Page d'inscription
    '/non-admin',       // Page d'accès refusé
    '/handler',         // Stack Auth handlers
    '/hub',             // Hub public
  ];

  const isPublicRoute = publicRoutes.some(route => url.startsWith(route));

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // ========================================
  // 2. ROUTES PROTÉGÉES (auth requise)
  // ========================================
  // Toutes les routes du dashboard nécessitent une authentification
  const protectedRoutes = [
    '/',                // Dashboard home
    '/planning',        // Planning et sous-routes (/planning/absences, /planning/extraction)
    '/employees',       // Gestion des employés
    '/history',         // Historique des modifications
    '/students',        // Gestion des étudiants
    '/01deck',          // 01deck
    '/analytics',       // Analytics
    '/config',          // Configuration
    '/customers',       // Clients
    '/account',         // Compte utilisateur
    '/promos',          // Promotions
  ];

  const isProtectedRoute = protectedRoutes.some(route => {
    // Route exacte ou sous-route
    return url === route || url.startsWith(route + '/');
  });

  if (isProtectedRoute) {
    // Vérification rapide : présence du cookie Stack Auth
    const cookies = req.cookies;
    const stackAccessCookie = cookies.get('stack-access');
    const refreshCookieName = `stack-refresh-${process.env.NEXT_PUBLIC_STACK_PROJECT_ID}--default`;
    const refreshCookie = cookies.get(refreshCookieName);

    // Si aucun cookie d'authentification trouvé, rediriger vers login
    if (!stackAccessCookie && !refreshCookie) {
      console.log('⛔ Middleware - Aucun cookie Stack Auth pour:', url);
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Cookie présent, laisser passer
    // La vérification complète (rôle, permissions) sera faite par le Server Component
    console.log('✅ Middleware - Cookie trouvé pour:', url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protéger toutes les routes sauf les fichiers statiques et API
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};