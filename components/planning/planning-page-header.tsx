'use client';

import { Badge } from '@/components/ui/badge';
import { PlanningNavTabs } from './planning-nav-tabs';
import type { LucideIcon } from 'lucide-react';

interface PlanningPageHeaderProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  permission: string;
  children?: React.ReactNode;
}

export function PlanningPageHeader({
  title,
  subtitle,
  icon: Icon,
  permission,
  children,
}: PlanningPageHeaderProps) {
  return (
    <div className="flex flex-col gap-2 flex-shrink-0">
      {/* Row 1: Nav tabs — always in the same position */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <PlanningNavTabs permission={permission} />
        <Badge
          variant="outline"
          className={
            permission === 'editor'
              ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
              : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400'
          }
        >
          {permission === 'editor' ? 'EDITOR' : 'READER'}
        </Badge>
      </div>
      {/* Row 2: Title + page actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 flex-wrap">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">{title}</h1>
            <p className="text-[11px] sm:text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {children && (
          <div className="flex items-center gap-2 flex-wrap">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
