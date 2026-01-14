import { pgTable, text, timestamp, serial, integer, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

// Conversations table
export const conversations = pgTable('conversations', {
  id: serial('id').primaryKey(),
  user_id: text('user_id').notNull(), // Email or session ID
  title: text('title').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

// Chat messages table
export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  conversation_id: integer('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'user' | 'assistant'
  content: text('content').notNull(),
  student_ids: jsonb('student_ids').$type<number[]>(), // Array of student IDs mentioned
  suggestions: jsonb('suggestions').$type<string[]>(), // Suggestions for follow-up
  intent: text('intent'), // Detected intent (search_student, get_stats, etc.)
  entities: jsonb('entities').$type<Record<string, any>>(), // Extracted entities
  created_at: timestamp('created_at').notNull().defaultNow(),
});

// Conversation context for RAG (keywords and entities for semantic search)
export const conversationContext = pgTable('conversation_context', {
  id: serial('id').primaryKey(),
  conversation_id: integer('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  message_id: integer('message_id')
    .notNull()
    .references(() => chatMessages.id, { onDelete: 'cascade' }),
  keywords: jsonb('keywords').$type<string[]>(), // Extracted keywords for search
  student_names: jsonb('student_names').$type<string[]>(), // Student names mentioned
  student_ids: jsonb('student_ids').$type<number[]>(), // Student IDs mentioned
  topics: jsonb('topics').$type<string[]>(), // Topics (stats, progression, retard, etc.)
  created_at: timestamp('created_at').notNull().defaultNow(),
});

// Insert schemas for validation
export const insertConversationSchema = createInsertSchema(conversations);
export const insertChatMessageSchema = createInsertSchema(chatMessages);
export const insertConversationContextSchema = createInsertSchema(conversationContext);

// Types
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;
export type ConversationContext = typeof conversationContext.$inferSelect;
export type InsertConversationContext = typeof conversationContext.$inferInsert;
