'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@stackframe/stack';
import { useChat, type Message as AIMessage } from 'ai/react';
import { ChatSidebar } from '@/components/assistant/chat-sidebar';
import { ChatInterface } from '@/components/assistant/chat-interface';
import { NovaLogo } from '@/components/assistant/nova-logo';
import { Loader2 } from 'lucide-react';

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

  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [initialMessages, setInitialMessages] = useState<AIMessage[]>([]);

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
      conversationId,
      userId,
    },
    initialMessages,
    onFinish: () => {
      loadConversations();
    },
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

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
        const loadedMessages: AIMessage[] = data.messages.map((msg: any) => ({
          id: msg.id.toString(),
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }));
        setInitialMessages(loadedMessages);
        setMessages(loadedMessages);
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
          messages={formattedMessages}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}
