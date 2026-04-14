'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Send, Loader2, BotIcon, Trash2, Maximize2,
} from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAssistantChat, type ChatMessage } from './use-assistant-chat';

interface AssistantOverlayProps {
  userId: string;
  onClose: () => void;
}

export function AssistantOverlay({ userId, onClose }: AssistantOverlayProps) {
  const { messages, isLoading, sendMessage, clearChat } = useAssistantChat(userId);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="fixed bottom-20 right-5 z-50 w-[400px] max-w-[calc(100vw-2.5rem)] h-[520px] max-h-[calc(100vh-7rem)] rounded-xl border bg-background shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-3 fade-in duration-200">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
        <BotIcon className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold flex-1">Nova</span>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={clearChat} title="Nouveau chat">
          <Trash2 className="h-3 w-3" />
        </Button>
        <Link href="/assistant" onClick={onClose}>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Plein écran">
            <Maximize2 className="h-3 w-3" />
          </Button>
        </Link>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <BotIcon className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Bonjour ! Je suis Nova.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Posez une question sur vos étudiants, promos, stats...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-xs">Nova réfléchit...</span>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t px-3 py-2">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Votre question..."
            className="flex-1 resize-none rounded-lg border bg-muted/50 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary max-h-20 min-h-[36px]"
            rows={1}
          />
          <Button
            size="sm"
            className="h-9 w-9 p-0 shrink-0"
            onClick={handleSubmit}
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'max-w-[85%] rounded-lg px-3 py-2 text-sm',
        isUser
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted'
      )}>
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1 [&>pre]:my-1">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
