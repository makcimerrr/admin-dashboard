'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, LayoutTemplate, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanningNavigationProps {
  planningPermission?: string;
}

export function PlanningNavigation({ planningPermission = 'reader' }: PlanningNavigationProps) {
  const pathname = usePathname();

  const navItems: Array<{
    href: string;
    label: string;
    icon: typeof LayoutTemplate;
    match: (path: string) => boolean;
  }> = [
    {
      href: '/planning',
      label: 'Planning',
      icon: LayoutTemplate,
      match: (path: string): boolean => path === '/planning',
    },
    {
      href: '/planning/absences',
      label: 'Absences',
      icon: Calendar,
      match: (path: string): boolean => path === '/planning/absences',
    },
    {
      href: '/planning/extraction',
      label: 'Extraction',
      icon: LayoutTemplate,
      match: (path: string): boolean => path === '/planning/extraction',
    },
    {
      href: '/employees',
      label: 'Employés',
      icon: Users,
      match: (path: string): boolean => path === '/employees',
    },
  ];

  // Add History only for editors
  if (planningPermission === 'editor') {
    navItems.push({
      href: '/history',
      label: 'Historique',
      icon: Clock,
      match: (path: string): boolean => path === '/history',
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.match(pathname);

        return (
          <Link key={item.href} href={item.href}>
            <Button
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'gap-2',
                isActive && 'shadow-sm'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Button>
          </Link>
        );
      })}
    </div>
  );
}
