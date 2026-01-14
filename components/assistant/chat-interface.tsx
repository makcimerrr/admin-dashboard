'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  Bot,
  User,
  Send,
  Loader2,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { NovaLogo } from './nova-logo';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  studentIds?: number[];
  suggestions?: string[];
};

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  placeholder?: string;
}

const SUGGESTED_PROMPTS = [
  "Combien d'étudiants sont actuellement en formation ?",
  "Montre-moi les étudiants en retard",
  "Quelles sont les statistiques globales ?",
  "Liste les étudiants validés",
];

export function ChatInterface({
  messages,
  isLoading,
  onSendMessage,
  placeholder = "Posez votre question...",
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Messages Area */}
      <ScrollArea className="flex-1">
        {messages.length === 0 ? (
          // Empty State
          <div className="flex items-center justify-center min-h-full">
            <div className="flex flex-col items-center justify-center text-center max-w-3xl mx-auto px-6 py-12">
              <div className="mb-8">
                <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 mb-4">
                  <NovaLogo className="h-16 w-16" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">
                  Bonjour, je suis Nova
                </h2>
                <p className="text-muted-foreground text-sm">
                  Comment puis-je vous aider avec le suivi des étudiants ?
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                {SUGGESTED_PROMPTS.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => onSendMessage(prompt)}
                    disabled={isLoading}
                    className={cn(
                      "text-left p-4 rounded-xl border border-border/40 bg-background",
                      "hover:bg-accent/50 transition-colors text-sm",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // Messages
          <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
            {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-4",
                    message.role === 'user' && "justify-end"
                  )}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="h-8 w-8 border border-border/40 flex-shrink-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
                      <AvatarFallback className="bg-transparent">
                        <NovaLogo className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div className={cn(
                    "flex-1 space-y-2",
                    message.role === 'user' && "max-w-[80%]"
                  )}>
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-3",
                        message.role === 'user'
                          ? "bg-primary text-primary-foreground ml-auto"
                          : "bg-muted/50"
                      )}
                    >
                      <div className={cn(
                        "text-[15px] leading-relaxed",
                        message.role === 'assistant' && "prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0"
                      )}>
                        {message.role === 'user' ? (
                          message.content
                        ) : (
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        )}
                      </div>
                    </div>

                    {/* Student Links */}
                    {message.studentIds && message.studentIds.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {message.studentIds.slice(0, 5).map((id) => (
                          <Button
                            key={id}
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                          >
                            <Link href={`/student?id=${id}`}>
                              <User className="h-3 w-3 mr-1" />
                              Étudiant #{id}
                            </Link>
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Suggestions */}
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {message.suggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => onSendMessage(suggestion)}
                            className="text-xs px-3 py-1.5 rounded-full border border-border/40 hover:bg-accent/50 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {message.role === 'user' && (
                    <Avatar className="h-8 w-8 border border-border/40 flex-shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-4">
                  <Avatar className="h-8 w-8 border border-border/40 bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
                    <AvatarFallback className="bg-transparent">
                      <NovaLogo className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-2 bg-muted/50 rounded-2xl px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      Nova réfléchit...
                    </span>
                  </div>
                </div>
              )}

              <div ref={scrollRef} />
            </div>
          )}
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              rows={1}
              className={cn(
                "w-full resize-none rounded-2xl px-4 py-3 pr-12",
                "bg-background border border-border/40",
                "focus:outline-none focus:ring-2 focus:ring-primary/20",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "text-[15px] leading-relaxed"
              )}
              style={{ maxHeight: '200px' }}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              size="icon"
              className="absolute right-2 bottom-2 h-8 w-8 rounded-lg"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          <p className="text-xs text-center text-muted-foreground/60 mt-2">
            L'assistant peut faire des erreurs. Vérifiez les informations importantes.
          </p>
        </div>
      </div>
    </div>
  );
}
