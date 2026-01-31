'use client';

import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';

interface ProjectCellProps {
  projectName: string | null;
  status: string | null;
  position: number | null;
  total: number | null;
  completed: boolean | null;
  trackNotStarted?: boolean;
}

// Status configuration with visual styles
const STATUS_CONFIG = {
  finished: {
    letter: 'F',
    emoji: '✅',
    text: 'Terminé',
    letterClass: 'bg-green-100 text-green-700 border-green-300'
  },
  working: {
    letter: 'W',
    emoji: '🔨',
    text: 'En cours',
    letterClass: 'bg-blue-100 text-blue-700 border-blue-300'
  },
  audit: {
    letter: 'A',
    emoji: '🔍',
    text: 'Audit',
    letterClass: 'bg-orange-100 text-orange-700 border-orange-300'
  },
  setup: {
    letter: 'S',
    emoji: '⚙️',
    text: 'Setup',
    letterClass: 'bg-purple-100 text-purple-700 border-purple-300'
  },
  'without group': {
    letter: 'X',
    emoji: '🚫',
    text: 'Sans groupe',
    letterClass: 'bg-red-100 text-red-700 border-red-300'
  },
  not_started: {
    letter: '-',
    emoji: '⏳',
    text: 'Non démarré',
    letterClass: 'bg-gray-100 text-gray-500 border-gray-300'
  },
  not_chosen: {
    letter: '?',
    emoji: '🤷',
    text: 'Non choisi',
    letterClass: 'bg-gray-100 text-gray-400 border-gray-300'
  },
  track_not_started: {
    letter: '-',
    emoji: '🕐',
    text: 'Tronc non démarré',
    letterClass: 'bg-slate-100 text-slate-400 border-slate-300'
  },
  default: {
    letter: '?',
    emoji: '❔',
    text: 'Inconnu',
    letterClass: 'bg-gray-100 text-gray-400 border-gray-300'
  }
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

function getStatusConfig(status: string | null) {
  if (!status) return STATUS_CONFIG.default;
  return STATUS_CONFIG[status as StatusKey] || STATUS_CONFIG.default;
}

export function ProjectCell({
  projectName,
  status,
  position,
  total,
  completed,
  trackNotStarted = false
}: ProjectCellProps) {
  // Handle track not started case
  if (trackNotStarted) {
    const config = STATUS_CONFIG.track_not_started;
    return (
      <div className="inline-flex items-center gap-1.5">
        <span
          className={cn(
            'inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold border',
            config.letterClass
          )}
        >
          {config.letter}
        </span>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium bg-slate-50 text-slate-400 border-slate-200 italic">
          Non démarré
        </div>
      </div>
    );
  }

  const config = getStatusConfig(status);
  const showPosition = position && total;
  const displayName = projectName || 'N/A';

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1.5">
            {/* Status letter badge */}
            <span
              className={cn(
                'inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold border shrink-0',
                config.letterClass
              )}
            >
              {config.letter}
            </span>

            {/* Position badge */}
            {showPosition && (
              <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                {position}/{total}
              </span>
            )}

            {/* Project name with completion indicator */}
            <div
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors max-w-[140px]',
                completed
                  ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              )}
            >
              <span className="truncate">{displayName}</span>
              {completed && (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="flex items-center gap-2 px-3 py-2">
          <span className="text-lg">{config.emoji}</span>
          <div className="flex flex-col">
            <span className="font-medium">{config.text}</span>
            {displayName !== 'N/A' && (
              <span className="text-xs text-muted-foreground">
                {displayName}
              </span>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
