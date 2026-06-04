import {
  SkeletonHeader,
  SkeletonPage,
  type SkeletonVariant,
} from '@/components/skeletons';

/**
 * Page header skeleton — kept for backwards compatibility.
 * Delegates to the unified skeleton kit (`SkeletonHeader`).
 */
export function PageHeaderSkeleton() {
  return <SkeletonHeader />;
}

type PageSkeletonVariant = Extract<SkeletonVariant, 'table' | 'cards' | 'dashboard' | 'tabs'>;

interface PageSkeletonProps {
  variant: PageSkeletonVariant;
  count?: number;
  columns?: number;
}

/**
 * Backwards-compatible wrapper around the unified `SkeletonPage`.
 * Existing callers pass `variant`, `count`, `columns`.
 */
export function PageSkeleton({ variant, count, columns }: PageSkeletonProps) {
  return (
    <SkeletonPage
      variant={variant}
      count={count}
      cardCols={columns as 1 | 2 | 3 | 4 | undefined}
    />
  );
}
