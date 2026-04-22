import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  badge?: React.ReactNode;
  /** @deprecated AppTabs in the layout now handles section navigation globally. */
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
        <div className="hidden md:flex items-center justify-between gap-2 flex-wrap">
          {tabs}
          {badge}
        </div>
      )}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="p-1.5 sm:p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg sm:rounded-xl shrink-0">
            <Icon className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-2xl md:text-3xl font-bold tracking-tight truncate">{title}</h1>
              {/* Badge inline with title on mobile when no tabs prop (the typical case now) */}
              {!tabs && badge && <div className="md:hidden">{badge}</div>}
            </div>
            {description && (
              <p className="text-sm text-muted-foreground hidden sm:block">{description}</p>
            )}
          </div>
        </div>
        {(children || (!tabs && badge)) && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Badge on desktop when no tabs — keeps it top-right next to children */}
            {!tabs && badge && <div className="hidden md:block">{badge}</div>}
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
