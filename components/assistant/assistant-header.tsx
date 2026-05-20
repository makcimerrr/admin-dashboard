'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BrainCircuit, Settings } from 'lucide-react';

export function AssistantHeader() {
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
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="gap-1.5 h-8 px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <Link href="/settings?tab=nova">
            <Settings className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Paramètres Nova</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
