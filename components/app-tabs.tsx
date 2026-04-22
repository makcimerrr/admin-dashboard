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
    <nav className="flex items-center gap-1 border-b px-3 lg:px-6 h-11 overflow-x-auto scrollbar-none">
      <span className="hidden md:inline text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mr-3 shrink-0">
        {app.label}
      </span>
      <div className="flex items-center gap-0.5 h-full shrink-0">
        {app.items.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem?.url === item.url;
          return (
            <Link
              key={item.url}
              href={item.url}
              className={cn(
                'flex items-center gap-1.5 px-3 h-full text-xs font-medium border-b-2 transition-colors -mb-px whitespace-nowrap',
                isActive
                  ? 'text-foreground border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground hover:border-border'
              )}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {item.title}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
