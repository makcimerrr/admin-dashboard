'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@stackframe/stack';
import { ChatSidebar } from '@/components/assistant/chat-sidebar';
import { ChatInterface } from '@/components/assistant/chat-interface';
import { NovaLogo } from '@/components/assistant/nova-logo';
import { Loader2 } from 'lucide-react';

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

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const user = useUser();
  const conversationId = parseInt(params.id as string);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);

  const userId = user?.primaryEmail || 'anonymous';

  // Load conversations
  useEffect(() => {
    if (userId && userId !== 'anonymous') {
      loadConversations();
    } else {
      setIsLoadingConversations(false);
    }
  }, [userId]);

  // Load messages for this conversation
  useEffect(() => {
    if (conversationId) {
      loadConversation();
    }
  }, [conversationId]);

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

  const loadConversation = async () => {
    setIsLoadingMessages(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}`);
      const data = await response.json();

      if (data.success) {
        setMessages(
          data.messages.map((msg: any) => ({
            id: msg.id.toString(),
            role: msg.role,
            content: msg.content,
            studentIds: msg.student_ids,
            suggestions: msg.suggestions,
          }))
        );
      } else {
        // Conversation not found, redirect to main page
        router.push('/assistant');
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      router.push('/assistant');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleNewChat = () => {
    router.push('/assistant');
  };

  const handleDeleteConversation = async (id: number) => {
    if (!confirm('Supprimer cette conversation ?')) return;

    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setConversations(conversations.filter((c) => c.id !== id));
        if (id === conversationId) {
          router.push('/assistant');
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
          conversationId,
          userId,
        }),
      });

      const data = await response.json();

      if (data.success && data.response) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response.text,
          studentIds: data.response.studentIds,
          suggestions: data.response.suggestions,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Reload conversations to update the "updated_at" timestamp
        loadConversations();
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

  if (isLoadingMessages) {
    return (
      <div className="flex h-full w-full bg-background">
        <ChatSidebar
          conversations={conversations}
          isLoading={isLoadingConversations}
          onNewChat={handleNewChat}
          onDeleteConversation={handleDeleteConversation}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-3">
              <NovaLogo className="h-8 w-8" />
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
            <span className="text-sm">Nova charge la conversation...</span>
          </div>
        </div>
      </div>
    );
  }

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
