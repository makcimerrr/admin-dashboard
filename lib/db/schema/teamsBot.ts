import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Référence de conversation Teams (Bot Framework) pour l'envoi proactif.
 *
 * Renseignée quand le bot est ajouté à une équipe/canal (activity
 * `conversationUpdate`). On garde la dernière conversation connue (une seule
 * ligne suffit pour le recap hebdo qui cible un canal unique).
 */
export const teamsBotConversation = pgTable('teams_bot_conversation', {
  id: serial('id').primaryKey(),
  serviceUrl: text('service_url'),
  conversationId: text('conversation_id'),
  tenantId: text('tenant_id'),
  channelId: text('channel_id'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type TeamsBotConversation = typeof teamsBotConversation.$inferSelect;
export type NewTeamsBotConversation = typeof teamsBotConversation.$inferInsert;
