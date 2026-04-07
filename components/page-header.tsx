import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  badge?: React.ReactNode;
  tabs?: React.ReactNode;
  children?: React.ReactNode;
}

export function PageHeader({
  icon: Icon,
  title,
  description,
  badge,
  tabs,
  children,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-2 flex-shrink-0">
      {tabs && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {tabs}
          {badge}
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold tracking-tight">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground hidden sm:block">{description}</p>
            )}
          </div>
        </div>
        {(children || (!tabs && badge)) && (
          <div className="flex items-center gap-2 flex-wrap">
            {!tabs && badge}
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
