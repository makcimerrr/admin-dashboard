import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/stack-server';

/**
 * Webhook Stack Auth - Appelé lors d'événements utilisateur
 * Configure : https://app.stack-auth.com → Settings → Webhooks
 * URL : https://votredomaine.com/api/stack-auth/webhook
 * Events : user.created, user.signed_in
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('📥 Webhook reçu:', body.type, body.data);

    // Événement: Nouvel utilisateur créé
    if (body.type === 'user.created') {
      const userId = body.data.user_id;

      console.log('👤 Nouvel utilisateur créé:', userId);

      // Définir les métadonnées par défaut dans Server Metadata
      // Utilisation de l'API Stack Auth directement
      const response = await fetch(
        `https://api.stack-auth.com/api/v1/users/${userId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-stack-project-id': process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
            'x-stack-secret-server-key': process.env.STACK_SECRET_SERVER_KEY!,
          },
          body: JSON.stringify({
            server_metadata: {
              role: 'user', // Pas d'accès par défaut
              planningPermission: 'reader', // Lecture seule par défaut
            },
          }),
        }
      );

      if (response.ok) {
        console.log('✅ Métadonnées définies pour:', userId);
        return NextResponse.json({ success: true });
      } else {
        const error = await response.text();
        console.error('❌ Erreur lors de la définition des métadonnées:', error);
        return NextResponse.json(
          { error: 'Failed to set metadata' },
          { status: 500 }
        );
      }
    }

    // Événement: Utilisateur connecté (pour vérification)
    if (body.type === 'user.signed_in') {
      const userId = body.data.user_id;
      console.log('🔐 Utilisateur connecté:', userId);

      // Optionnel: Vérifier si les métadonnées existent, sinon les créer
      // Ceci est un filet de sécurité au cas où le webhook user.created ne se serait pas déclenché
      const user = await stackServerApp.getUser({ userId });

      if (user && !user.serverMetadata?.role) {
        console.log('⚠️  Métadonnées manquantes, création pour:', userId);

        const response = await fetch(
          `https://api.stack-auth.com/api/v1/users/${userId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'x-stack-project-id': process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
              'x-stack-secret-server-key': process.env.STACK_SECRET_SERVER_KEY!,
            },
            body: JSON.stringify({
              server_metadata: {
                role: 'user',
                planningPermission: 'reader',
              },
            }),
          }
        );

        if (response.ok) {
          console.log('✅ Métadonnées créées lors de la connexion pour:', userId);
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Event processed' });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
