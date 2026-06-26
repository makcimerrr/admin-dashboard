'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { findActiveApp, findActiveItem } from '@/lib/nav-apps';

export function AppTabs() {
  const pathname = usePathname();
  const app = findActiveApp(pathname);

  // Hide if no app detected, or app has no sub-items (direct link like Dashboard)
  if (!app || !app.items || app.items.length === 0) return null;

  const activeItem = findActiveItem(app, pathname);
  const GroupIcon = app.icon;

  return (
    <nav
      aria-label={`Navigation ${app.label}`}
      className="flex items-center gap-2 border-b bg-muted/20 px-3 lg:px-6 py-2.5 overflow-x-auto scrollbar-none"
    >
      {/* Fil d'Ariane de section : « <icône> Pédagogie › » */}
      <span className="hidden md:inline-flex items-center gap-1.5 mr-1 shrink-0 text-sm font-semibold text-foreground">
        {GroupIcon && <GroupIcon className="h-4 w-4 text-muted-foreground" />}
        {app.label}
        <ChevronRight className="h-4 w-4 text-muted-foreground/50" aria-hidden="true" />
      </span>

      {/* Onglets « ghost » : sans bordure, survol = fond doux, actif = fond
          bleuté + texte bleu (rounded, pas de pilule). Style dashboard épuré. */}
      <div className="flex items-center gap-1 shrink-0">
        {app.items.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem?.url === item.url;
          return (
            <Link
              key={item.url}
              href={item.url}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors',
                isActive
                  ? 'bg-primary/15 text-primary font-semibold'
                  // Inactif : surface douce permanente → se lit comme un bouton
                  // cliquable (pas juste du texte). Survol = plus contrasté.
                  : 'bg-muted/60 text-foreground/80 font-medium hover:bg-muted hover:text-foreground'
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
