'use client';

import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AlertTriangle, Briefcase } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';

interface StudentCellProps {
  firstName: string;
  lastName: string;
  login: string;
  isDropout: boolean;
  isAlternant: boolean;
  dropoutReason?: string | null;
  companyName?: string | null;
}

export function StudentCell({
  firstName,
  lastName,
  login,
  isDropout,
  isAlternant,
  dropoutReason,
  companyName
}: StudentCellProps) {
  const initials = `${firstName[0]}${lastName[0]}`;

  return (
    <div className="flex items-center gap-3">
      <Avatar
        className={cn(
          'h-10 w-10 border-2',
          isDropout ? 'border-red-300 opacity-60' : 'border-border'
        )}
      >
        <AvatarFallback
          className={cn(
            'font-medium text-sm',
            isDropout
              ? 'bg-red-100 text-red-600'
              : 'bg-primary/10 text-primary'
          )}
        >
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5">
          {/* Dropout indicator */}
          {isDropout && (
            <TooltipProvider>
              <Tooltip delayDuration={200}>
                <TooltipTrigger>
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs font-medium">Étudiant en perdition</p>
                  {dropoutReason && (
                    <p className="text-xs text-muted-foreground">
                      Raison: {dropoutReason}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Alternant indicator */}
          {isAlternant && (
            <TooltipProvider>
              <Tooltip delayDuration={200}>
                <TooltipTrigger>
                  <Briefcase className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs font-medium">Alternant</p>
                  {companyName && (
                    <p className="text-xs text-muted-foreground">
                      {companyName}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Student name */}
          <span
            className={cn(
              'font-medium text-sm transition-colors truncate',
              isDropout
                ? 'text-red-700 line-through'
                : 'text-foreground group-hover:text-primary'
            )}
          >
            {firstName} {lastName}
          </span>
        </div>

        {/* Login */}
        <span className="text-xs text-muted-foreground font-mono truncate">
          {login}
        </span>
      </div>
    </div>
  );
}
