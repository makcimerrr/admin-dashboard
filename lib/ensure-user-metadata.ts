import "server-only";
import { makeLog } from "@/lib/log";

const log = makeLog('stack-auth:metadata');

/**
 * Vérifie et crée les métadonnées utilisateur si elles n'existent pas.
 * Solution de secours si le webhook ne s'est pas déclenché.
 */
export async function ensureUserMetadata(userId: string): Promise<void> {
  try {
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
      log.error('Failed to fetch user', await response.text());
      return;
    }

    const user = await response.json();

    if (user.server_metadata?.role && user.client_read_only_metadata?.planningPermission) {
      log.debug('Metadata already set', userId);
      return;
    }

    log.info('Creating default metadata', userId);

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
      log.info('Default metadata created', userId);
    } else {
      log.error('Failed to create metadata', await updateResponse.text());
    }
  } catch (error) {
    log.error('Unexpected error', error);
  }
}
