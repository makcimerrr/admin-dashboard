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
  PanelLeftClose,
  PanelLeftOpen,
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
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by date
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday); startOfWeek.setDate(startOfWeek.getDate() - 7);

  const groups: { title: string; items: Conversation[] }[] = [
    { title: "Aujourd'hui", items: [] },
    { title: 'Hier', items: [] },
    { title: 'Cette semaine', items: [] },
    { title: 'Plus ancien', items: [] },
  ];

  filteredConversations.forEach((conv) => {
    const date = new Date(conv.updated_at);
    if (date >= startOfToday) groups[0].items.push(conv);
    else if (date >= startOfYesterday) groups[1].items.push(conv);
    else if (date >= startOfWeek) groups[2].items.push(conv);
    else groups[3].items.push(conv);
  });

  if (collapsed) {
    return (
      <div className="w-12 border-r flex flex-col items-center py-3 gap-2 bg-muted/30">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCollapsed(false)}>
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
        <Button size="icon" className="h-8 w-8" onClick={onNewChat}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-64 lg:w-72 border-r flex flex-col bg-muted/30">
      {/* Header */}
      <div className="p-2.5 space-y-2 border-b">
        <div className="flex items-center gap-1.5">
          <Button onClick={onNewChat} size="sm" className="flex-1 justify-start gap-2 h-8 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Nouveau chat
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setCollapsed(true)}>
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className="pl-8 h-8 text-xs bg-background/50"
          />
        </div>
      </div>

      {/* Conversations */}
      <ScrollArea className="flex-1 px-1.5 py-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <MessageSquare className="h-8 w-8 mb-2 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground/50">
              {searchQuery ? 'Aucun résultat' : 'Aucune conversation'}
            </p>
          </div>
        ) : (
          groups.map(({ title, items }) => {
            if (items.length === 0) return null;
            return (
              <div key={title} className="mb-3">
                <div className="px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                  {title}
                </div>
                <div className="space-y-px">
                  {items.map((conv) => {
                    const isActive = pathname === `/assistant/${conv.id}`;
                    return (
                      <div
                        key={conv.id}
                        className={cn(
                          "group relative rounded-md transition-colors",
                          isActive && "bg-accent"
                        )}
                      >
                        <Link
                          href={`/assistant/${conv.id}`}
                          className={cn(
                            "block px-2.5 py-1.5 pr-8 rounded-md text-xs transition-colors",
                            "hover:bg-accent/80",
                            isActive ? "text-foreground font-medium" : "text-muted-foreground"
                          )}
                        >
                          <div className="truncate">{conv.title}</div>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          onClick={(e) => { e.preventDefault(); onDeleteConversation(conv.id); }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="px-3 py-2 border-t text-[10px] text-muted-foreground/40 font-medium">
        {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
