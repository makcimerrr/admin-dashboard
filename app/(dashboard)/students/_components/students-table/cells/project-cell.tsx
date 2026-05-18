'use client';

import { cn } from '@/lib/utils';
import { PILL } from '@/lib/status-pills';
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
    letterClass: PILL.emerald
  },
  working: {
    letter: 'W',
    emoji: '🔨',
    text: 'En cours',
    letterClass: PILL.blue
  },
  audit: {
    letter: 'A',
    emoji: '🔍',
    text: 'Audit',
    letterClass: PILL.orange
  },
  setup: {
    letter: 'S',
    emoji: '⚙️',
    text: 'Setup',
    letterClass: PILL.violet
  },
  'without group': {
    letter: 'X',
    emoji: '🚫',
    text: 'Sans groupe',
    letterClass: PILL.red
  },
  not_started: {
    letter: '-',
    emoji: '⏳',
    text: 'Non démarré',
    letterClass: 'bg-muted text-muted-foreground border-border'
  },
  not_chosen: {
    letter: '?',
    emoji: '🤷',
    text: 'Non choisi',
    letterClass: 'bg-muted text-muted-foreground/70 border-border'
  },
  track_not_started: {
    letter: '-',
    emoji: '🕐',
    text: 'Tronc non démarré',
    letterClass: 'bg-muted text-muted-foreground/70 border-border'
  },
  default: {
    letter: '?',
    emoji: '❔',
    text: 'Inconnu',
    letterClass: 'bg-muted text-muted-foreground/70 border-border'
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
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium bg-muted text-muted-foreground border-border italic">
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
                  ? PILL.emerald
                  : 'bg-muted text-muted-foreground border-border hover:bg-muted/70'
              )}
            >
              <span className="truncate">{displayName}</span>
              {completed && (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
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
