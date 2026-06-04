'use client';

import { useState, useEffect, useRef } from 'react';
import { useData, mutateKey } from '@/lib/client-cache';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@stackframe/stack';
import { ChatSidebar, ChatSidebarMobile } from '@/components/assistant/chat-sidebar';
import { ChatInterface } from '@/components/assistant/chat-interface';
import { BrainCircuit, Loader2 } from 'lucide-react';

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
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const userId = user?.primaryEmail || 'anonymous';
  const isKnownUser = !!userId && userId !== 'anonymous';
  const conversationsKey = isKnownUser
    ? `/api/conversations?userId=${encodeURIComponent(userId)}`
    : null;

  const {
    data: conversationsData,
    isLoading: conversationsFetching,
    mutate: loadConversations,
  } = useData<{ success: boolean; conversations: Conversation[] }>(conversationsKey);
  const conversations = conversationsData?.success ? conversationsData.conversations : [];
  const isLoadingConversations = isKnownUser && conversationsFetching;

  // Load messages for this conversation
  useEffect(() => {
    if (conversationId) {
      loadConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const loadConversation = async () => {
    setIsLoadingMessages(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}`);
      const data = await response.json();

      if (data.success) {
        setMessages(
          data.messages.map((msg: { id: number; role: string; content: string; student_ids?: number[]; suggestions?: string[] }) => ({
            id: msg.id.toString(),
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            studentIds: msg.student_ids,
            suggestions: msg.suggestions,
          }))
        );
      } else {
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
        if (conversationsKey) {
          const next = {
            success: true,
            conversations: conversations.filter((c) => c.id !== id),
          };
          mutateKey(conversationsKey, () => Promise.resolve(next));
        }
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

    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    const assistantMessageId = (Date.now() + 1).toString();

    // Abort any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          conversationId,
          userId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      // Add assistant message
      setMessages((prev) => [
        ...prev,
        { id: assistantMessageId, role: 'assistant', content: data.response },
      ]);

      // Reload conversations
      loadConversations();
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return;
      }
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        { id: assistantMessageId, role: 'assistant', content: "Désolé, une erreur s'est produite. Veuillez réessayer." },
      ]);
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
        <div className="flex-1 flex flex-col">
          <div className="md:hidden flex items-center gap-2 border-b px-2 py-1.5 shrink-0">
            <ChatSidebarMobile
              conversations={conversations}
              isLoading={isLoadingConversations}
              onNewChat={handleNewChat}
              onDeleteConversation={handleDeleteConversation}
            />
            <span className="text-xs text-muted-foreground">Nova</span>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/70">
                  <BrainCircuit className="h-4 w-4 text-primary-foreground" />
                </div>
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
              <span className="text-sm">Chargement de la conversation...</span>
            </div>
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
      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <div className="md:hidden flex items-center gap-2 border-b px-2 py-1.5 shrink-0">
          <ChatSidebarMobile
            conversations={conversations}
            isLoading={isLoadingConversations}
            onNewChat={handleNewChat}
            onDeleteConversation={handleDeleteConversation}
          />
          <span className="text-xs text-muted-foreground">Nova</span>
        </div>
        <ChatInterface
          messages={messages}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}
