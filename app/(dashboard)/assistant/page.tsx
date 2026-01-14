'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@stackframe/stack';
import { ChatSidebar } from '@/components/assistant/chat-sidebar';
import { ChatInterface } from '@/components/assistant/chat-interface';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  studentIds?: number[];
  suggestions?: string[];
};

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);

  const userId = user?.primaryEmail || 'anonymous';

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

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          conversationId: currentConversationId,
          userId,
        }),
      });

      const data = await response.json();

      if (data.success && data.response) {
        // If new conversation was created, redirect to it
        if (!currentConversationId && data.conversationId) {
          router.push(`/assistant/${data.conversationId}`);
          return;
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response.text,
          studentIds: data.response.studentIds,
          suggestions: data.response.suggestions,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Erreur inconnue');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Désolé, une erreur s'est produite. Veuillez réessayer.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

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
          messages={messages}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}
