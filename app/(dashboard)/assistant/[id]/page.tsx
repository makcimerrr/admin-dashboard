'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  const loadConversations = useCallback(async () => {
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
  }, [userId]);

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

    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Assistant message will be created when we receive the first chunk
    const assistantMessageId = (Date.now() + 1).toString();
    let assistantMessageCreated = false;

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

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Parse SSE format from AI SDK
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('0:')) {
            // Text content
            try {
              const content = JSON.parse(line.slice(2));
              fullContent += content;

              // Create assistant message on first chunk
              if (!assistantMessageCreated) {
                assistantMessageCreated = true;
                setMessages((prev) => [
                  ...prev,
                  { id: assistantMessageId, role: 'assistant', content: fullContent },
                ]);
              } else {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId ? { ...m, content: fullContent } : m
                  )
                );
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      // Reload conversations after message is complete
      loadConversations();
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return;
      }
      console.error('Error sending message:', error);
      // Show error message
      if (assistantMessageCreated) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? { ...m, content: "Désolé, une erreur s'est produite. Veuillez réessayer." }
              : m
          )
        );
      } else {
        setMessages((prev) => [
          ...prev,
          { id: assistantMessageId, role: 'assistant', content: "Désolé, une erreur s'est produite. Veuillez réessayer." },
        ]);
      }
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
