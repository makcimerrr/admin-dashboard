'use client';

import { useState, useRef, useCallback } from 'react';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export function useAssistantChat(userId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const assistantId = (Date.now() + 1).toString();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          conversationId,
          userId,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error('Failed');

      const data = await res.json();
      if (data.conversationId && !conversationId) setConversationId(data.conversationId);

      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: data.response }]);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: "Désolé, une erreur s'est produite." }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, conversationId, userId]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, []);

  return { messages, isLoading, sendMessage, clearChat };
}
