'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_APPS, findActiveApp, pathMatches, filterAppsByRole, type NavApp } from '@/lib/nav-apps';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  user?: { role?: string } | null;
}

export function BottomNav({ user }: BottomNavProps) {
  const pathname = usePathname();
  const apps = filterAppsByRole(NAV_APPS, user?.role);
  const activeApp = findActiveApp(pathname);

  const isAppActive = (app: NavApp) => {
    if (app.url) return pathMatches(pathname, app.url) && (app.url !== '/' || pathname === '/');
    return activeApp?.key === app.key;
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-around bg-sidebar border-t shadow-[0_-2px_8px_rgba(0,0,0,0.04)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {apps.map((app) => {
        const Icon = app.icon;
        const active = isAppActive(app);
        const href = app.url ?? app.defaultUrl ?? '#';
        const className = cn(
          'flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-2 px-1 transition-colors',
          active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        );

        const label = (
          <span className="text-[9px] font-medium truncate max-w-full leading-none">{app.label}</span>
        );

        return app.external ? (
          <a key={app.key} href={href} target="_blank" rel="noopener noreferrer" className={className}>
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </a>
        ) : (
          <Link key={app.key} href={href} className={className}>
            <div className="relative">
              {active && <span className="absolute -inset-1 bg-primary/10 rounded-lg -z-10" />}
              <Icon className="h-5 w-5 shrink-0" />
            </div>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
