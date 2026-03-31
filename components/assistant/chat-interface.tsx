'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  User,
  Send,
  Loader2,
  BrainCircuit,
  GraduationCap,
  BarChart3,
  Users,
  Search,
  ArrowUp,
} from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  { text: "Combien d'étudiants sont en formation ?", icon: Users },
  { text: "Montre-moi les étudiants en retard", icon: Search },
  { text: "Statistiques globales", icon: BarChart3 },
  { text: "Fais-moi un brief complet", icon: GraduationCap },
];

const SLASH_COMMANDS = [
  { cmd: '/stats', description: 'Statistiques globales', expand: 'Donne-moi les statistiques globales de toutes les promotions avec répartition par statut.' },
  { cmd: '/retard', description: 'Étudiants en retard', expand: 'Liste tous les étudiants en retard, groupés par promotion.' },
  { cmd: '/audit', description: 'Groupes en audit', expand: 'Montre-moi tous les groupes en attente d\'audit avec les détails.' },
  { cmd: '/brief', description: 'Résumé complet', expand: 'Fais un brief complet : stats par promo, étudiants en retard, groupes en attente d\'audit, étudiants en perdition, alternants. Donne des recommandations.' },
  { cmd: '/update', description: 'Mettre à jour une promo', expand: 'Liste les promotions disponibles pour que je puisse déclencher une mise à jour.' },
  { cmd: '/perdition', description: 'Étudiants en perdition', expand: 'Liste tous les étudiants en perdition avec les raisons et dates.' },
  { cmd: '/export', description: 'Exporter en CSV', expand: 'Génère un export CSV des données demandées. Quelles données veux-tu exporter ? (étudiants, retards, audits...)' },
  { cmd: '/alternants', description: 'Liste des alternants', expand: 'Liste tous les alternants avec leurs entreprises et tuteurs.' },
];

export function ChatInterface({
  messages,
  isLoading,
  onSendMessage,
  placeholder = "Posez une question ou tapez / pour les commandes...",
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  // Slash command detection
  useEffect(() => {
    if (input.startsWith('/')) {
      setShowSlashMenu(true);
      setSlashFilter(input.toLowerCase());
    } else {
      setShowSlashMenu(false);
    }
  }, [input]);

  const filteredCommands = SLASH_COMMANDS.filter(c =>
    c.cmd.startsWith(slashFilter) || c.description.toLowerCase().includes(slashFilter.slice(1))
  );

  const handleSlashSelect = (cmd: typeof SLASH_COMMANDS[number]) => {
    setInput('');
    setShowSlashMenu(false);
    onSendMessage(cmd.expand);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Check if it's a slash command
    const matchedCmd = SLASH_COMMANDS.find(c => c.cmd === input.trim().split(' ')[0]);
    if (matchedCmd) {
      const extraArgs = input.trim().slice(matchedCmd.cmd.length).trim();
      const expanded = extraArgs ? `${matchedCmd.expand} Contexte: ${extraArgs}` : matchedCmd.expand;
      onSendMessage(expanded);
    } else {
      onSendMessage(input);
    }
    setInput('');
    setShowSlashMenu(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto px-6 py-16">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/20 mb-4">
                  <BrainCircuit className="h-7 w-7 text-white" />
                </div>
                <h2 className="text-xl font-semibold tracking-tight mb-1">
                  Comment puis-je vous aider ?
                </h2>
                <p className="text-sm text-muted-foreground">
                  Interrogez les données en langage naturel
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {SUGGESTED_PROMPTS.map(({ text, icon: Icon }, index) => (
                  <button
                    key={index}
                    onClick={() => onSendMessage(text)}
                    disabled={isLoading}
                    className={cn(
                      "text-left p-3 rounded-xl border bg-card",
                      "hover:bg-accent/50 hover:border-accent transition-all text-sm",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      "flex items-start gap-2.5"
                    )}
                  >
                    <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <span className="text-xs leading-relaxed">{text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6 space-y-5">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn("flex gap-3", message.role === 'user' && "justify-end")}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 shrink-0 mt-0.5">
                    <BrainCircuit className="h-3.5 w-3.5 text-white" />
                  </div>
                )}

                <div className={cn("flex-1 space-y-1.5", message.role === 'user' && "max-w-[80%]")}>
                  <div
                    className={cn(
                      "rounded-2xl px-3.5 py-2.5 text-sm",
                      message.role === 'user'
                        ? "bg-primary text-primary-foreground ml-auto"
                        : "bg-muted/60"
                    )}
                  >
                    <div className={cn(
                      "leading-relaxed",
                      message.role === 'assistant' && "prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2 prose-pre:my-2"
                    )}>
                      {message.role === 'user' ? (
                        message.content
                      ) : (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            table: ({ children }) => (
                              <div className="overflow-x-auto my-2">
                                <table className="min-w-full text-xs border-collapse">{children}</table>
                              </div>
                            ),
                            thead: ({ children }) => <thead className="bg-muted/80">{children}</thead>,
                            th: ({ children }) => <th className="px-3 py-1.5 text-left font-semibold border-b">{children}</th>,
                            td: ({ children }) => <td className="px-3 py-1.5 border-b border-border/30">{children}</td>,
                          }}
                        >{message.content}</ReactMarkdown>
                      )}
                    </div>
                  </div>

                  {/* Student quick links */}
                  {message.studentIds && message.studentIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {message.studentIds.slice(0, 5).map((id) => (
                        <Button key={id} asChild variant="outline" size="sm" className="h-6 text-[10px] px-2">
                          <Link href={`/student?id=${id}`}>
                            <User className="h-2.5 w-2.5 mr-1" />
                            #{id}
                          </Link>
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* Suggestions */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {message.suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => onSendMessage(suggestion)}
                          className="text-[11px] px-2.5 py-1 rounded-full border hover:bg-accent/50 transition-colors text-muted-foreground hover:text-foreground"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      <User className="h-3.5 w-3.5" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 shrink-0">
                  <BrainCircuit className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="flex items-center gap-2 bg-muted/60 rounded-2xl px-3.5 py-2.5">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" />
                  </div>
                </div>
              </div>
            )}

            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t bg-background/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-3">
          <form onSubmit={handleSubmit} className="relative">
            {/* Slash command autocomplete */}
            {showSlashMenu && filteredCommands.length > 0 && (
              <div className="absolute bottom-full mb-1 left-0 right-0 bg-popover border rounded-lg shadow-lg overflow-hidden z-10">
                {filteredCommands.map((cmd) => (
                  <button
                    key={cmd.cmd}
                    type="button"
                    onClick={() => handleSlashSelect(cmd)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent transition-colors"
                  >
                    <code className="text-xs font-mono text-violet-500 bg-violet-500/10 px-1.5 py-0.5 rounded">{cmd.cmd}</code>
                    <span className="text-xs text-muted-foreground">{cmd.description}</span>
                  </button>
                ))}
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              rows={1}
              className={cn(
                "w-full resize-none rounded-xl px-4 py-2.5 pr-11",
                "bg-muted/50 border-0 ring-1 ring-border/50",
                "focus:outline-none focus:ring-2 focus:ring-violet-500/30",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "text-sm leading-relaxed placeholder:text-muted-foreground/50"
              )}
              style={{ maxHeight: '160px' }}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              size="icon"
              className={cn(
                "absolute right-1.5 bottom-1.5 h-7 w-7 rounded-lg",
                "bg-violet-600 hover:bg-violet-700 text-white",
                "disabled:bg-muted disabled:text-muted-foreground"
              )}
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ArrowUp className="h-3.5 w-3.5" />
              )}
            </Button>
          </form>
          <p className="text-[10px] text-center text-muted-foreground/40 mt-1.5">
            Nova peut faire des erreurs. Vérifiez les informations importantes.
          </p>
        </div>
      </div>
    </div>
  );
}
