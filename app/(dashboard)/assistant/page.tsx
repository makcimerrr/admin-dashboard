'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@stackframe/stack';
import { useChat } from 'ai/react';
import { ChatSidebar } from '@/components/assistant/chat-sidebar';
import { ChatInterface } from '@/components/assistant/chat-interface';

type Conversation = {
  id: number;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export default function AssistantPage() {
  const user = useUser();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);

  const userId = user?.primaryEmail || 'anonymous';

  // Hook useChat du Vercel AI SDK pour le streaming
  const {
    messages,
    isLoading,
    setMessages,
    append,
  } = useChat({
    api: '/api/chat',
    body: {
      conversationId: currentConversationId,
      userId,
    },
    onFinish: () => {
      loadConversations();
    },
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  // Load conversations on mount
  useEffect(() => {
    if (userId && userId !== 'anonymous') {
      loadConversations();
    } else {
      setIsLoadingConversations(false);
    }
  }, [userId]);

  const loadConversations = async () => {
    setIsLoadingConversations(true);
    try {
      const response = await fetch(`/api/conversations?userId=${encodeURIComponent(userId)}`);
      const data = await response.json();
      if (data.success) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
    router.push('/assistant');
  };

  const handleDeleteConversation = async (conversationId: number) => {
    if (!confirm('Supprimer cette conversation ?')) return;

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setConversations(conversations.filter((c) => c.id !== conversationId));
        if (currentConversationId === conversationId) {
          handleNewChat();
        }
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  // Fonction pour envoyer un message
  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    await append({
      role: 'user',
      content: messageText,
    });
  };

  // Transformer les messages pour le format attendu par ChatInterface
  const formattedMessages = messages.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.content,
    studentIds: undefined,
    suggestions: undefined,
  }));

  return (
    <div className="flex h-full w-full bg-background">
      <ChatSidebar
        conversations={conversations}
        isLoading={isLoadingConversations}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
      />
      <div className="flex-1 min-w-0">
        <ChatInterface
          messages={formattedMessages}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}
