'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Calendar, FileText, LayoutTemplate } from 'lucide-react';

const items = [
  { href: '/word_assistant', label: 'Hub', icon: Home, exact: true },
  { href: '/word_assistant/events', label: 'Événements', icon: Calendar },
  { href: '/word_assistant/templates', label: 'Modèles', icon: LayoutTemplate },
  { href: '/word_assistant/calendar', label: 'Calendrier', icon: FileText },
];

/**
 * Segmented sub-navigation shared by every /word_assistant/* page.
 * Provides discoverability without dedicated sidebar entries for each
 * sub-route.
 */
export function WordAssistantSubnav() {
  const pathname = usePathname();
  return (
    <div className="inline-flex items-center gap-1 rounded-md border bg-muted/30 p-0.5">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'h-7 px-3 rounded text-xs font-medium flex items-center gap-1.5 transition-colors',
              active
                ? 'bg-background shadow-sm border'
                : 'hover:bg-background/60 text-muted-foreground',
            )}
          >
            <Icon className="h-3 w-3" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
