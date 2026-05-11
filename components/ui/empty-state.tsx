import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** Compact variant: smaller icon + tighter spacing. Default = comfort. */
  size?: 'compact' | 'comfort';
}

/**
 * Standard empty state used across pages, tables, lists.
 *
 *     <EmptyState
 *       icon={ClipboardCheck}
 *       title="Aucun groupe à afficher"
 *       description="Tous les groupes sont audités ou archivés."
 *       action={<Button>Voir l'historique</Button>}
 *     />
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  size = 'comfort',
}: EmptyStateProps) {
  const compact = size === 'compact';
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-1.5 py-6' : 'gap-2 py-12',
        className,
      )}
    >
      {Icon && (
        <Icon
          className={cn(
            'text-muted-foreground/40',
            compact ? 'h-6 w-6' : 'h-8 w-8',
          )}
        />
      )}
      <p className={cn('font-medium', compact ? 'text-xs' : 'text-sm')}>{title}</p>
      {description && (
        <p className={cn('text-muted-foreground max-w-sm', compact ? 'text-[11px]' : 'text-xs')}>
          {description}
        </p>
      )}
      {action && <div className={cn(compact ? 'mt-1' : 'mt-2')}>{action}</div>}
    </div>
  );
}
