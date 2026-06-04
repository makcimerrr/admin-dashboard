import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type StatTone = 'default' | 'success' | 'warning' | 'destructive' | 'primary';

const toneValueClasses: Record<StatTone, string> = {
  default: 'text-foreground',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
  primary: 'text-primary',
};

interface StatCardProps {
  /** Short descriptive label for the KPI. */
  label: string;
  /** The headline value. */
  value: string | number;
  /** Optional Lucide icon shown next to the label. */
  icon?: LucideIcon;
  /** Optional secondary line beneath the value. */
  hint?: string;
  /** Semantic color applied to the value. */
  tone?: StatTone;
}

/**
 * Tokenized KPI card. Presentational only — renders a label, a headline value,
 * an optional icon and hint. Built on the shared Card primitive.
 */
export function StatCard({ label, value, icon: Icon, hint, tone = 'default' }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold', toneValueClasses[tone])}>{value}</div>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}
