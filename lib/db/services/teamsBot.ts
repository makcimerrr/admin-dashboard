import { db } from '../config';
import { teamsBotConversation, type TeamsBotConversation } from '../schema/teamsBot';
import { desc, eq } from 'drizzle-orm';

export interface ConversationRef {
  serviceUrl: string;
  conversationId: string;
  tenantId?: string | null;
  channelId?: string | null;
}

/**
 * Enregistre/actualise la référence de conversation Teams pour l'envoi proactif.
 * On garde une seule ligne (id le plus récent) : si une conversation existe déjà
 * on met à jour ses champs, sinon on insère.
 */
export async function upsertConversation(ref: ConversationRef): Promise<void> {
  const [existing] = await db
    .select({ id: teamsBotConversation.id })
    .from(teamsBotConversation)
    .orderBy(desc(teamsBotConversation.id))
    .limit(1);

  if (existing) {
    await db
      .update(teamsBotConversation)
      .set({
        serviceUrl: ref.serviceUrl,
        conversationId: ref.conversationId,
        tenantId: ref.tenantId ?? null,
        channelId: ref.channelId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(teamsBotConversation.id, existing.id));
    return;
  }

  await db.insert(teamsBotConversation).values({
    serviceUrl: ref.serviceUrl,
    conversationId: ref.conversationId,
    tenantId: ref.tenantId ?? null,
    channelId: ref.channelId ?? null,
  });
}

/** Récupère la dernière conversation Teams enregistrée (ou null). */
export async function getConversation(): Promise<TeamsBotConversation | null> {
  const [row] = await db
    .select()
    .from(teamsBotConversation)
    .orderBy(desc(teamsBotConversation.id))
    .limit(1);
  return row ?? null;
}
