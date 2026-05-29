'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { List, GraduationCap, MessageSquare } from 'lucide-react';

/**
 * Segmented nav shown at the top of /students, /students/specialties and
 * /students/discord. Lets users switch between views without going through
 * the sidebar.
 */
export function StudentsSubnav() {
  const pathname = usePathname();
  const items = [
    { href: '/students', label: 'Liste', icon: List },
    { href: '/students/specialties', label: 'Par spécialité', icon: GraduationCap },
    { href: '/students/discord', label: 'Discord', icon: MessageSquare },
  ];

  return (
    <div className="inline-flex items-center gap-1 rounded-md border bg-muted/30 p-0.5">
      {items.map(({ href, label, icon: Icon }) => {
        // Exact match for /students; prefix match for sub-routes (e.g. /students/specialties).
        const active =
          href === '/students'
            ? pathname === '/students'
            : pathname.startsWith(href);
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
