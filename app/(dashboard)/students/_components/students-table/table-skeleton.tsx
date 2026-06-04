import { SkeletonTable } from '@/components/skeletons';

/**
 * Lightweight skeleton for the students table.
 *
 * Delegates to the unified `SkeletonTable` kit component: a header strip + a
 * handful of simple rows instead of cloning the full 8-column cell tree. Keeps
 * the same export name and `{ rows }` prop so existing imports keep working.
 */
export function StudentsTableSkeleton({ rows = 6 }: { rows?: number }) {
  // Cap rows so the loading state stays light even if callers ask for more.
  return <SkeletonTable rows={Math.min(rows, 6)} cols={6} toolbar={false} />;
}

/**
 * Compact overlay for inline loading states (e.g. pagination, filtering).
 */
export function StudentsLoadingOverlay() {
  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    </div>
  );
}
