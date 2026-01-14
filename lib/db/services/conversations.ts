import { db } from '../config';
import {
  conversations,
  chatMessages,
  conversationContext,
  type Conversation,
  type InsertConversation,
  type ChatMessage,
  type InsertChatMessage,
  type InsertConversationContext,
} from '../schema';
import { eq, desc, and, sql, or } from 'drizzle-orm';

// Create a new conversation
export async function createConversation(userId: string, title: string): Promise<Conversation> {
  const [conversation] = await db
    .insert(conversations)
    .values({
      user_id: userId,
      title,
    })
    .returning();
  return conversation;
}

// Get all conversations for a user
export async function getUserConversations(userId: string): Promise<Conversation[]> {
  return await db
    .select()
    .from(conversations)
    .where(eq(conversations.user_id, userId))
    .orderBy(desc(conversations.updated_at));
}

// Get a specific conversation with its messages
export async function getConversationWithMessages(conversationId: number): Promise<{
  conversation: Conversation | null;
  messages: ChatMessage[];
}> {
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId));

  if (!conversation) {
    return { conversation: null, messages: [] };
  }

  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.conversation_id, conversationId))
    .orderBy(chatMessages.created_at);

  return { conversation, messages };
}

// Add a message to a conversation
export async function addMessage(
  conversationId: number,
  role: 'user' | 'assistant',
  content: string,
  studentIds?: number[],
  suggestions?: string[],
  intent?: string,
  entities?: Record<string, any>
): Promise<ChatMessage> {
  const [message] = await db
    .insert(chatMessages)
    .values({
      conversation_id: conversationId,
      role,
      content,
      student_ids: studentIds,
      suggestions,
      intent,
      entities,
    })
    .returning();

  // Update conversation's updated_at timestamp
  await db
    .update(conversations)
    .set({ updated_at: new Date() })
    .where(eq(conversations.id, conversationId));

  return message;
}

// Extract keywords from text for RAG
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'à', 'au', 'aux',
    'et', 'ou', 'mais', 'donc', 'or', 'ni', 'car', 'pour', 'sur', 'dans',
    'avec', 'sans', 'sous', 'par', 'est', 'sont', 'était', 'être', 'avoir',
    'a', 'ai', 'as', 'avons', 'avez', 'ont', 'ce', 'cet', 'cette', 'ces',
    'il', 'elle', 'ils', 'elles', 'qui', 'que', 'quoi', 'dont', 'où',
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\wàâäéèêëïîôùûüÿç\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));

  return [...new Set(words)]; // Remove duplicates
}

// Add context for RAG
export async function addConversationContext(
  conversationId: number,
  messageId: number,
  content: string,
  studentNames?: string[],
  studentIds?: number[],
  topics?: string[]
): Promise<void> {
  const keywords = extractKeywords(content);

  await db.insert(conversationContext).values({
    conversation_id: conversationId,
    message_id: messageId,
    keywords,
    student_names: studentNames || [],
    student_ids: studentIds || [],
    topics: topics || [],
  });
}

// RAG: Find similar conversations based on keywords
export async function findSimilarConversations(
  userId: string,
  keywords: string[],
  currentConversationId?: number,
  limit: number = 5
): Promise<{
  conversationId: number;
  messageId: number;
  content: string;
  relevanceScore: number;
}[]> {
  if (keywords.length === 0) return [];

  // Build a query to find conversations with matching keywords
  const keywordConditions = keywords.map((keyword) =>
    sql`${conversationContext.keywords}::text LIKE ${'%' + keyword + '%'}`
  );

  const results = await db
    .select({
      conversationId: conversationContext.conversation_id,
      messageId: conversationContext.message_id,
      content: chatMessages.content,
      keywords: conversationContext.keywords,
      studentIds: conversationContext.student_ids,
      topics: conversationContext.topics,
    })
    .from(conversationContext)
    .innerJoin(chatMessages, eq(conversationContext.message_id, chatMessages.id))
    .innerJoin(conversations, eq(conversationContext.conversation_id, conversations.id))
    .where(
      and(
        eq(conversations.user_id, userId),
        currentConversationId
          ? sql`${conversationContext.conversation_id} != ${currentConversationId}`
          : sql`true`,
        or(...keywordConditions)
      )
    )
    .limit(limit * 3); // Get more results to calculate relevance

  // Calculate relevance score
  const scoredResults = results.map((result) => {
    const resultKeywords = (result.keywords || []) as string[];
    const matchingKeywords = keywords.filter((k) =>
      resultKeywords.some((rk) => rk.includes(k) || k.includes(rk))
    );
    const relevanceScore = matchingKeywords.length / keywords.length;

    return {
      conversationId: result.conversationId,
      messageId: result.messageId,
      content: result.content,
      relevanceScore,
    };
  });

  // Sort by relevance and return top results
  return scoredResults
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);
}

// RAG: Get conversation context for a new message
export async function getConversationContextForQuery(
  userId: string,
  query: string,
  currentConversationId?: number
): Promise<string> {
  const keywords = extractKeywords(query);
  const similarConversations = await findSimilarConversations(
    userId,
    keywords,
    currentConversationId,
    3
  );

  if (similarConversations.length === 0) {
    return '';
  }

  // Build context from similar conversations
  const context = similarConversations
    .map((conv, i) => `[${i + 1}] ${conv.content}`)
    .join('\n');

  return `Contexte des conversations précédentes :\n${context}\n\n`;
}

// Update conversation title
export async function updateConversationTitle(
  conversationId: number,
  title: string
): Promise<void> {
  await db
    .update(conversations)
    .set({ title, updated_at: new Date() })
    .where(eq(conversations.id, conversationId));
}

// Delete a conversation and all its messages
export async function deleteConversation(conversationId: number): Promise<void> {
  await db.delete(conversations).where(eq(conversations.id, conversationId));
  // Messages and context will be deleted automatically due to cascade
}

// Get conversation statistics for a user
export async function getUserConversationStats(userId: string): Promise<{
  totalConversations: number;
  totalMessages: number;
}> {
  const [conversationCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(conversations)
    .where(eq(conversations.user_id, userId));

  const [messageCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(chatMessages)
    .innerJoin(conversations, eq(chatMessages.conversation_id, conversations.id))
    .where(eq(conversations.user_id, userId));

  return {
    totalConversations: conversationCount.count || 0,
    totalMessages: messageCount.count || 0,
  };
}
