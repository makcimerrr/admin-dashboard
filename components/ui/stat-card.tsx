import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  /** Theme-aware accent color via CSS variable, e.g. 'var(--chart-1)'.
   * Defaults to the muted/foreground colour scheme. */
  accent?: string;
  /** Optional click handler — turns the card into a button. */
  onClick?: () => void;
  /** Optional href — turns the card into a link. Server component safe. */
  href?: string;
  className?: string;
  /** When true, renders a skeleton in place of the value (and hint).
   * Prefer this to passing a "0" / "—" fallback during the loading window. */
  loading?: boolean;
}

/**
 * Compact metric card. Use for KPIs in dashboards, headers, or strip rows.
 *
 *     <StatCard label="Étudiants actifs" value={data.totalStudents} icon={Users} />
 *     <StatCard
 *       label="Validés"
 *       value={validated}
 *       hint="Cette promo"
 *       accent="var(--chart-2)"
 *     />
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  onClick,
  href,
  className,
  loading,
}: StatCardProps) {
  const interactive = Boolean(onClick || href);
  const cardClasses = cn(
    'border transition-colors',
    interactive && 'hover:border-foreground/20 hover:bg-muted/30 cursor-pointer',
    className,
  );

  const inner = (
    <>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
        <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </CardTitle>
        {Icon && (
          <Icon
            className="h-4 w-4"
            style={accent ? { color: accent } : undefined}
            aria-hidden
          />
        )}
      </CardHeader>
      <CardContent className="pb-3 pt-0 px-4">
        {loading ? (
          <>
            <Skeleton className="h-7 w-16 rounded" />
            {hint && <Skeleton className="h-3 w-24 rounded mt-2" />}
          </>
        ) : (
          <>
            <div
              className="text-2xl font-bold leading-none tabular-nums"
              style={accent ? { color: accent } : undefined}
            >
              {value}
            </div>
            {hint && <p className="text-[11px] text-muted-foreground mt-1.5">{hint}</p>}
          </>
        )}
      </CardContent>
    </>
  );

  if (href) {
    return (
      <a href={href} className={cn('block', cardClasses)}>
        <Card className="border-0 shadow-none bg-transparent">{inner}</Card>
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn('text-left w-full block', cardClasses)}>
        <Card className="border-0 shadow-none bg-transparent">{inner}</Card>
      </button>
    );
  }
  return <Card className={cardClasses}>{inner}</Card>;
}
