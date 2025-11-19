import { NextResponse, NextRequest } from "next/server";

/**
 * Middleware temporairement désactivé
 *
 * L'authentification via Stack Auth SDK dans le middleware (Edge Runtime)
 * pose des problèmes de compatibilité avec l'API Stack Auth.
 *
 * L'authentification est maintenant gérée par les Server Components dans les layouts.
 * Chaque layout vérifie l'utilisateur avec stackServerApp.getUser() qui fonctionne
 * correctement dans le Node Runtime.
 *
 * Pour réactiver l'auth dans le middleware, il faudrait :
 * 1. Utiliser le SDK Stack Auth officiel compatible Edge Runtime
 * 2. Ou configurer correctement l'API Stack Auth (problème actuel: token JWT non reconnu)
 */

export async function middleware(req: NextRequest) {
    const url = req.nextUrl.pathname;

    console.log('📍 Middleware (auth désactivée):', url);

    // Laisser passer toutes les requêtes
    // L'auth sera vérifiée par les Server Components
    return NextResponse.next();
}

export const config = {
    matcher: [
        // Exclure les routes statiques et API
        "/((?!api|_next/static|_next/image|favicon.ico|handler).*)"],
};