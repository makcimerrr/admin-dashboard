'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MessageSquare, Settings, HelpCircle, Sparkles } from 'lucide-react';
import { NovaLogo } from './nova-logo';

export function AssistantHeader() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/assistant') {
      return pathname === '/assistant' || pathname.startsWith('/assistant/') && !pathname.includes('/settings') && !pathname.includes('/help');
    }
    return pathname.startsWith(path);
  };

  return (
    <header className="border-b border-border/40 bg-background/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 h-14">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <NovaLogo className="h-6 w-6" />
            <span className="font-semibold text-lg">Nova</span>
            <Sparkles className="h-4 w-4 text-blue-500" />
          </div>
        </div>
        <nav className="flex items-center gap-1">
          <Link href="/assistant">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "gap-2",
                isActive('/assistant') && "bg-accent"
              )}
            >
              <MessageSquare className="h-4 w-4" />
              <span>Chat</span>
            </Button>
          </Link>
          <Link href="/assistant/help">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "gap-2",
                isActive('/assistant/help') && "bg-accent"
              )}
            >
              <HelpCircle className="h-4 w-4" />
              <span>Aide</span>
            </Button>
          </Link>
          <Link href="/assistant/settings">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "gap-2",
                isActive('/assistant/settings') && "bg-accent"
              )}
            >
              <Settings className="h-4 w-4" />
              <span>Paramètres</span>
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
