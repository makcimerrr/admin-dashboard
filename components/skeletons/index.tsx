import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Unified, lightweight skeleton kit.
 *
 * Every piece is built from the `Skeleton` primitive (animate-pulse + bg-muted)
 * and uses design tokens only (no hard-coded colours). Components are kept
 * deliberately small (few DOM nodes) so navigation feels instant and the
 * loading state never looks heavier than the real content.
 *
 * Building blocks:
 *   - SkeletonHeader  : page title + subtitle (+ optional icon)
 *   - SkeletonTable   : header row + N body rows
 *   - SkeletonCards   : responsive grid of placeholder cards
 *   - SkeletonForm    : stacked label/field pairs + actions
 *   - SkeletonChart   : single chart-shaped block (+ optional stat row)
 *
 * Page-level helper:
 *   - SkeletonPage    : SkeletonHeader + a chosen body variant
 */

// Tailwind can't statically analyse `grid-cols-${n}`, so map to known classes.
const GRID_COLS: Record<number, string> = {
  1: '',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
};

/** Page header placeholder: icon tile + title + subtitle. */
export function SkeletonHeader({
  icon = true,
  className,
}: {
  icon?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2 sm:gap-3', className)}>
      {icon && <Skeleton className="h-9 w-9 sm:h-12 sm:w-12 rounded-lg sm:rounded-xl shrink-0" />}
      <div className="space-y-2">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-3 w-56 hidden sm:block" />
      </div>
    </div>
  );
}

/** A lightweight table: optional toolbar, header strip, N rows of `cols` cells. */
export function SkeletonTable({
  rows = 6,
  cols = 4,
  toolbar = true,
  className,
}: {
  rows?: number;
  cols?: number;
  toolbar?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {toolbar && <Skeleton className="h-9 w-full max-w-sm" />}
      <div className="rounded-lg border border-border overflow-hidden">
        {/* header strip */}
        <div className="flex items-center gap-4 p-3 bg-muted/50">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className={cn('h-4', i === 0 ? 'w-24' : 'flex-1')} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 p-3 border-t border-border">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={cn('h-4', c === 0 ? 'w-24' : 'flex-1')} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** A responsive grid of simple placeholder cards. */
export function SkeletonCards({
  count = 4,
  cols = 4,
  className,
}: {
  count?: number;
  cols?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-2 gap-3', GRID_COLS[cols] ?? GRID_COLS[4], className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border p-4 space-y-2 bg-card">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

/** A stacked form: N label/field pairs + a pair of action buttons. */
export function SkeletonForm({
  fields = 4,
  className,
}: {
  fields?: number;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border border-border p-4 sm:p-6 space-y-5 bg-card', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}

/** A chart-shaped block, optionally preceded by a stat row. */
export function SkeletonChart({
  stats = false,
  className,
}: {
  stats?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {stats && <SkeletonCards count={4} cols={4} />}
      <Skeleton className="h-72 w-full rounded-lg" />
    </div>
  );
}

/** A horizontal tab strip + large content block. */
export function SkeletonTabs({
  tabs = 4,
  className,
}: {
  tabs?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex gap-2">
        {Array.from({ length: tabs }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-md" />
        ))}
      </div>
      <Skeleton className="h-80 w-full rounded-lg" />
    </div>
  );
}

/** A chat layout: conversation sidebar + message bubbles + composer. */
export function SkeletonChat({ className }: { className?: string }) {
  return (
    <div className={cn('flex h-full gap-4 p-4 md:p-6 animate-in fade-in duration-300', className)}>
      <div className="hidden md:flex w-64 flex-col gap-2 shrink-0">
        <Skeleton className="h-9 w-full rounded-md" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex-1 space-y-4">
          <Skeleton className="h-16 w-3/4 rounded-lg" />
          <Skeleton className="h-12 w-2/3 ml-auto rounded-lg" />
          <Skeleton className="h-20 w-3/4 rounded-lg" />
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
}

export type SkeletonVariant = 'table' | 'cards' | 'form' | 'chart' | 'tabs' | 'dashboard';

interface SkeletonPageProps {
  variant?: SkeletonVariant;
  /** table rows / cards count */
  count?: number;
  /** table columns */
  cols?: number;
  /** grid columns for cards */
  cardCols?: 1 | 2 | 3 | 4;
  /** form fields */
  fields?: number;
  className?: string;
}

/** Full-page skeleton: header + a chosen body variant, in the standard page container. */
export function SkeletonPage({
  variant = 'table',
  count,
  cols,
  cardCols,
  fields,
  className,
}: SkeletonPageProps) {
  return (
    <div className={cn('page-container flex flex-col gap-4 md:gap-6 p-4 md:p-6 animate-in fade-in duration-300', className)}>
      <SkeletonHeader />
      {variant === 'table' && <SkeletonTable rows={count} cols={cols} />}
      {variant === 'cards' && <SkeletonCards count={count} cols={cardCols} />}
      {variant === 'form' && <SkeletonForm fields={fields} />}
      {variant === 'chart' && <SkeletonChart stats />}
      {variant === 'tabs' && <SkeletonTabs />}
      {variant === 'dashboard' && (
        <>
          <SkeletonCards count={4} cols={4} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </>
      )}
    </div>
  );
}
