'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { findActiveApp, findActiveItem } from '@/lib/nav-apps';

export function AppTabs() {
  const pathname = usePathname();
  const app = findActiveApp(pathname);

  // Hide if no app detected, or app has no sub-items (direct link like Dashboard)
  if (!app || !app.items || app.items.length === 0) return null;

  const activeItem = findActiveItem(app, pathname);

  return (
    <nav className="flex items-center gap-1 border-b bg-muted/20 px-3 lg:px-6 h-[52px] overflow-x-auto scrollbar-none">
      {/* Section courante (groupe) — plus lisible + séparateur */}
      <span className="hidden md:inline-flex items-center text-sm font-semibold text-foreground mr-2 shrink-0">
        {app.label}
      </span>
      <span className="hidden md:block h-5 w-px bg-border mr-2 shrink-0" aria-hidden="true" />
      <div className="flex items-center gap-1 h-full shrink-0">
        {app.items.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem?.url === item.url;
          return (
            <Link
              key={item.url}
              href={item.url}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2 px-3.5 h-full text-sm border-b-2 transition-colors -mb-px whitespace-nowrap rounded-t-md',
                isActive
                  ? 'text-primary border-primary bg-primary/10 font-semibold'
                  : 'text-muted-foreground border-transparent font-medium hover:text-foreground hover:bg-muted/60'
              )}
            >
              {Icon && <Icon className="h-4 w-4 shrink-0" />}
              {item.title}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
