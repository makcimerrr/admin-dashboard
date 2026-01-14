'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Loader2,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Conversation = {
  id: number;
  title: string;
  updated_at: string;
};

interface ChatSidebarProps {
  conversations: Conversation[];
  isLoading: boolean;
  onNewChat: () => void;
  onDeleteConversation: (id: number) => void;
}

export function ChatSidebar({
  conversations,
  isLoading,
  onNewChat,
  onDeleteConversation,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();

  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group conversations by date
  const today: Conversation[] = [];
  const yesterday: Conversation[] = [];
  const thisWeek: Conversation[] = [];
  const older: Conversation[] = [];

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  filteredConversations.forEach((conv) => {
    const date = new Date(conv.updated_at);
    if (date >= startOfToday) {
      today.push(conv);
    } else if (date >= startOfYesterday) {
      yesterday.push(conv);
    } else if (date >= startOfWeek) {
      thisWeek.push(conv);
    } else {
      older.push(conv);
    }
  });

  const ConversationItem = ({ conv }: { conv: Conversation }) => {
    const isActive = pathname === `/assistant/${conv.id}`;

    return (
      <div
        className={cn(
          "group relative rounded-lg transition-colors",
          isActive && "bg-accent"
        )}
      >
        <Link
          href={`/assistant/${conv.id}`}
          className={cn(
            "block px-3 py-2 pr-10 rounded-lg text-sm transition-colors",
            "hover:bg-accent",
            isActive ? "text-foreground font-medium" : "text-muted-foreground"
          )}
        >
          <div className="truncate">{conv.title}</div>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7",
            "opacity-0 group-hover:opacity-100 transition-opacity"
          )}
          onClick={(e) => {
            e.preventDefault();
            onDeleteConversation(conv.id);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  };

  const ConversationGroup = ({ title, items }: { title: string; items: Conversation[] }) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-4">
        <div className="px-3 mb-2 text-xs font-medium text-muted-foreground/60">
          {title}
        </div>
        <div className="space-y-0.5">
          {items.map((conv) => (
            <ConversationItem key={conv.id} conv={conv} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-72 border-r border-border/40 flex flex-col bg-background/95 backdrop-blur-sm">
      {/* Header */}
      <div className="p-3 space-y-3 border-b border-border/40">
        <Button
          onClick={onNewChat}
          className="w-full justify-start gap-2 h-10"
        >
          <Plus className="h-4 w-4" />
          <span>Nouveau chat</span>
        </Button>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className="pl-9 h-9 bg-background"
          />
        </div>
      </div>

      {/* Conversations */}
      <ScrollArea className="flex-1 px-2 py-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <MessageSquare className="h-10 w-10 mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground/60">
              {searchQuery ? 'Aucun résultat' : 'Aucune conversation'}
            </p>
          </div>
        ) : (
          <>
            <ConversationGroup title="Aujourd'hui" items={today} />
            <ConversationGroup title="Hier" items={yesterday} />
            <ConversationGroup title="Cette semaine" items={thisWeek} />
            <ConversationGroup title="Plus ancien" items={older} />
          </>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-border/40 text-xs text-muted-foreground/60 flex items-center gap-2">
        <Clock className="h-3.5 w-3.5" />
        <span>{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}
