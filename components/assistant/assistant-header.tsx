'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MessageSquare, Settings, HelpCircle, BrainCircuit } from 'lucide-react';

export function AssistantHeader() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/assistant') {
      return (pathname === '/assistant' || pathname.startsWith('/assistant/')) && !pathname.includes('/settings') && !pathname.includes('/help');
    }
    return pathname.startsWith(path);
  };

  const navItems = [
    { href: '/assistant', label: 'Chat', icon: MessageSquare, path: '/assistant' },
    { href: '/assistant/help', label: 'Aide', icon: HelpCircle, path: '/assistant/help' },
    { href: '/assistant/settings', label: 'Paramètres', icon: Settings, path: '/assistant/settings' },
  ];

  return (
    <header className="border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between px-4 lg:px-6 h-12">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 shadow-sm">
            <BrainCircuit className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-base tracking-tight">Nova</span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
            AI
          </span>
        </div>
        <nav className="flex items-center gap-0.5">
          {navItems.map(({ href, label, icon: Icon, path }) => (
            <Link key={href} href={href}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "gap-1.5 h-8 px-3 text-xs font-medium transition-all",
                  isActive(path)
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </Button>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
