/**
 * Authentification Stack Auth pour le middleware (Edge Runtime)
 * Ne peut pas utiliser le SDK Stack Auth car incompatible avec Edge Runtime
 */

import { NextRequest } from 'next/server';

export interface StackUser {
  id: string;
  primaryEmail: string | null;
  displayName: string | null;
  profileImageUrl: string | null;
  serverMetadata?: Record<string, any>;
  clientReadOnlyMetadata?: Record<string, any>;
  clientMetadata?: Record<string, any>;
}

/**
 * Récupère l'utilisateur connecté depuis les cookies Stack Auth
 * Compatible avec le middleware (Edge Runtime)
 */
export async function getStackUserFromRequest(req: NextRequest): Promise<StackUser | null> {
  try {
    // Récupérer le token d'accès depuis les cookies
    const cookies = req.cookies;

    // Stack Auth utilise un cookie "stack-access" qui contient un tableau JSON
    let accessToken: string | null = null;

    // Stack Auth peut utiliser différents formats de cookies
    // Format 1: stack-access (array de tokens)
    const stackAccessCookie = cookies.get('stack-access');
    if (stackAccessCookie?.value) {
      try {
        const accessTokens = JSON.parse(stackAccessCookie.value);
        console.log('🔍 stack-access contenu:', JSON.stringify(accessTokens).substring(0, 100) + '...');

        if (Array.isArray(accessTokens) && accessTokens.length >= 2) {
          // Stack Auth stocke [refreshToken, accessToken] dans cet ordre
          // L'access token est un JWT (commence par "eyJ")
          // Le refresh token est un ID aléatoire
          const potentialAccessToken = accessTokens.find((token: any) =>
            typeof token === 'string' && token.startsWith('eyJ')
          );

          if (potentialAccessToken) {
            accessToken = potentialAccessToken;
            console.log('🔑 Access Token JWT trouvé:', accessToken?.substring(0, 30) + '...');
          } else {
            // Fallback: prendre le deuxième élément si le premier ne fonctionne pas
            accessToken = accessTokens[1] || accessTokens[0];
            console.log('🔑 Token extrait (fallback):', accessToken?.substring(0, 30) + '...');
          }
        } else if (Array.isArray(accessTokens) && accessTokens.length === 1) {
          accessToken = accessTokens[0];
          console.log('🔑 Token unique trouvé:', accessToken?.substring(0, 30) + '...');
        }
      } catch (e) {
        console.error('❌ Erreur parsing stack-access cookie:', e);
      }
    }

    // Format 2: stack-refresh-{PROJECT_ID}--default (contient access_token)
    const refreshCookieName = `stack-refresh-${process.env.NEXT_PUBLIC_STACK_PROJECT_ID}--default`;
    const refreshCookie = cookies.get(refreshCookieName);
    if (refreshCookie?.value) {
      try {
        const refreshData = JSON.parse(refreshCookie.value);
        console.log('🔍 refresh cookie contenu:', JSON.stringify(refreshData).substring(0, 150) + '...');
        if (refreshData.access_token) {
          accessToken = refreshData.access_token;
          console.log('🔑 Access token trouvé dans refresh cookie:', accessToken?.substring(0, 30) + '...');
        }
      } catch (e) {
        console.error('❌ Erreur parsing refresh cookie:', e);
      }
    }

    // Fallback: chercher dans d'autres formats possibles
    if (!accessToken) {
      const possibleCookieNames = [
        `stack-access-token-${process.env.NEXT_PUBLIC_STACK_PROJECT_ID}`,
        'stack-access-token',
        `stack-session-${process.env.NEXT_PUBLIC_STACK_PROJECT_ID}`,
      ];

      for (const cookieName of possibleCookieNames) {
        const cookie = cookies.get(cookieName);
        if (cookie?.value) {
          accessToken = cookie.value;
          console.log('🔑 Token trouvé dans', cookieName);
          break;
        }
      }
    }

    if (!accessToken) {
      console.log('❌ Aucun token d\'accès trouvé');
      return null;
    }

    // Vérifier le token avec l'API Stack Auth
    console.log('🌐 Appel API Stack Auth /users/me...');
    console.log('🔑 Token length:', accessToken.length);
    console.log('🔑 Token start:', accessToken.substring(0, 50));

    // Essayer différentes configurations pour l'authentification
    // Configuration 1: Avec x-stack-access-type: 'client'
    let response = await fetch('https://api.stack-auth.com/api/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-stack-project-id': process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
        'x-stack-publishable-client-key': process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
        'x-stack-access-type': 'client',
      },
      cache: 'no-store',
    });

    // Si échec, essayer sans Authorization header (juste le token dans x-stack-access-token)
    if (!response.ok) {
      console.log('🔄 Retry avec x-stack-access-token header...');
      response = await fetch('https://api.stack-auth.com/api/v1/users/me', {
        headers: {
          'x-stack-access-token': accessToken,
          'x-stack-project-id': process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
          'x-stack-publishable-client-key': process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
          'x-stack-access-type': 'client',
        },
        cache: 'no-store',
      });
    }

    console.log('📊 Réponse API Status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erreur API Stack Auth:', response.status, errorText);
      return null;
    }

    const user = await response.json();
    console.log('✅ Utilisateur récupéré:', user.id, user.primary_email || user.primaryEmail);

    return {
      id: user.id,
      primaryEmail: user.primary_email || null,
      displayName: user.display_name || null,
      profileImageUrl: user.profile_image_url || null,
      serverMetadata: user.server_metadata,
      clientReadOnlyMetadata: user.client_read_only_metadata,
      clientMetadata: user.client_metadata,
    };
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de l\'utilisateur:', error);
    return null;
  }
}
