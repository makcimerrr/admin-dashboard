import "server-only";

/**
 * Vérifie et crée les métadonnées utilisateur si elles n'existent pas
 * Solution de secours si le webhook ne s'est pas déclenché
 */
export async function ensureUserMetadata(userId: string): Promise<void> {
  try {
    // Récupérer l'utilisateur
    const response = await fetch(
      `https://api.stack-auth.com/api/v1/users/${userId}`,
      {
        method: 'GET',
        headers: {
          'x-stack-project-id': process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
          'x-stack-secret-server-key': process.env.STACK_SECRET_SERVER_KEY!,
        },
      }
    );

    if (!response.ok) {
      console.error('❌ Erreur lors de la récupération de l\'utilisateur:', await response.text());
      return;
    }

    const user = await response.json();

    // Vérifier si les métadonnées existent déjà
    if (user.server_metadata?.role && user.client_read_only_metadata?.planningPermission) {
      console.log('✅ Métadonnées déjà définies pour:', userId);
      return;
    }

    console.log('⚠️  Métadonnées manquantes, création automatique pour:', userId);

    // Créer les métadonnées par défaut
    const updateResponse = await fetch(
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
            role: user.server_metadata?.role || 'user',
          },
          client_read_only_metadata: {
            role: user.server_metadata?.role || user.client_read_only_metadata?.role || 'user',
            planningPermission: user.client_read_only_metadata?.planningPermission || 'reader',
          },
        }),
      }
    );

    if (updateResponse.ok) {
      console.log('✅ Métadonnées créées automatiquement pour:', userId);
    } else {
      console.error('❌ Erreur lors de la création des métadonnées:', await updateResponse.text());
    }
  } catch (error) {
    console.error('❌ Erreur dans ensureUserMetadata:', error);
  }
}
