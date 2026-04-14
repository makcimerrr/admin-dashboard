'use client';

import { useState } from 'react';
import { BotIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AssistantOverlay } from './assistant-overlay';

interface AssistantBubbleProps {
  userId: string;
}

export function AssistantBubble({ userId }: AssistantBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <AssistantOverlay userId={userId} onClose={() => setIsOpen(false)} />
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={cn(
          "fixed bottom-5 right-5 z-50 flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all hover:scale-105",
          isOpen
            ? "bg-muted text-muted-foreground hover:bg-muted/80"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
      >
        {isOpen ? <X className="h-5 w-5" /> : <BotIcon className="h-5 w-5" />}
      </button>
    </>
  );
}
