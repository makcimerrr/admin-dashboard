import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionTitleProps {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  /** Right-side content: actions, badges, etc. */
  action?: ReactNode;
  className?: string;
}

/**
 * Lightweight section header for in-page sub-sections. Smaller and less
 * decorated than PageHeader. Use to introduce a block inside a page, e.g.
 * "Statistiques", "Membres en retard", etc.
 *
 *     <SectionTitle
 *       icon={Users}
 *       title="Membres actifs"
 *       description="Mis à jour il y a 5 minutes"
 *       action={<Button size="sm">Exporter</Button>}
 *     />
 */
export function SectionTitle({ icon: Icon, title, description, action, className }: SectionTitleProps) {
  return (
    <div className={cn('flex items-center justify-between gap-3 flex-wrap', className)}>
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold truncate">{title}</h2>
          {description && (
            <p className="text-[11px] text-muted-foreground truncate">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
}
