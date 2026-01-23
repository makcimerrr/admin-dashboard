'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const userId = user?.primaryEmail || 'anonymous';

  // Load conversations on mount
  useEffect(() => {
    if (userId && userId !== 'anonymous') {
      loadConversations();
    } else {
      setIsLoadingConversations(false);
    }
  }, [userId]);

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
          conversationId: currentConversationId,
          userId,
        }),
        signal: abortControllerRef.current.signal,
      });

      // Check for new conversation ID in header
      const newConversationId = response.headers.get('X-Conversation-Id');
      if (newConversationId && !currentConversationId) {
        const id = parseInt(newConversationId);
        setCurrentConversationId(id);
        router.push(`/assistant/${id}`);
      }

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
