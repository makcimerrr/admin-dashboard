import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface LoadingCardProps {
  /** Approximate height of the loaded card. Defaults to a comfortable widget. */
  height?: 'sm' | 'md' | 'lg';
  /** Render N copies in a grid. */
  count?: number;
  /** Grid columns for multi-card mode (counts > 1). Defaults to 'auto-fill'. */
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

const HEIGHT_CLASS = {
  sm: 'h-24',
  md: 'h-40',
  lg: 'h-64',
} as const;

const COLS_CLASS = {
  1: '',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
} as const;

/**
 * Unified loading state for card-shaped widgets.
 *
 *     <LoadingCard height="lg" />
 *     <LoadingCard count={4} columns={4} height="sm" />
 */
export function LoadingCard({ height = 'md', count = 1, columns = 1, className }: LoadingCardProps) {
  if (count === 1) {
    return <Skeleton className={cn(HEIGHT_CLASS[height], 'rounded-lg w-full', className)} />;
  }
  return (
    <div className={cn('grid gap-3', COLS_CLASS[columns], className)}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={cn(HEIGHT_CLASS[height], 'rounded-lg')} />
      ))}
    </div>
  );
}
