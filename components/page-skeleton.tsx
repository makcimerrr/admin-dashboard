import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function PageHeaderSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-3 w-60 hidden sm:block" />
      </div>
    </div>
  );
}

function TableSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-full max-w-sm" />
      <div className="rounded-lg border">
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-3 border-t">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Tailwind can't statically analyse `grid-cols-${n}`, so map to known classes.
const COLS: Record<number, string> = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
};

function CardsSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className={cn('grid grid-cols-2 gap-3', COLS[columns] ?? COLS[4])}>
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
      <div className="col-span-full">
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  );
}

function TabsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-md" />
        ))}
      </div>
      <Skeleton className="h-80 w-full rounded-lg" />
    </div>
  );
}

type PageSkeletonVariant = 'table' | 'cards' | 'dashboard' | 'tabs';

interface PageSkeletonProps {
  variant: PageSkeletonVariant;
  count?: number;
  columns?: number;
}

export function PageSkeleton({ variant, count, columns }: PageSkeletonProps) {
  return (
    <div className="page-container flex flex-col gap-4 md:gap-5 p-4 md:p-6">
      <PageHeaderSkeleton />
      {variant === 'table' && <TableSkeleton count={count} />}
      {variant === 'cards' && <CardsSkeleton columns={columns} />}
      {variant === 'dashboard' && <DashboardSkeleton />}
      {variant === 'tabs' && <TabsSkeleton />}
    </div>
  );
}
