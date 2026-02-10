'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Clock, LayoutTemplate, Users, FileBarChart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanningNavTabsProps {
  permission?: string;
}

const navItems = [
  { href: '/planning', label: 'Planning', icon: LayoutTemplate, match: (p: string) => p === '/planning' },
  { href: '/planning/absences', label: 'Absences', icon: Calendar, match: (p: string) => p === '/planning/absences' },
  { href: '/planning/extraction', label: 'Extraction', icon: FileBarChart, match: (p: string) => p === '/planning/extraction' },
  { href: '/employees', label: 'Employés', icon: Users, match: (p: string) => p === '/employees' },
];

export function PlanningNavTabs({ permission = 'reader' }: PlanningNavTabsProps) {
  const pathname = usePathname();

  const items = permission === 'editor'
    ? [...navItems, { href: '/history', label: 'Historique', icon: Clock, match: (p: string) => p === '/history' }]
    : navItems;

  return (
    <div className="inline-flex rounded-md bg-muted p-0.5">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.match(pathname);
        return (
          <Link key={item.href} href={item.href}>
            <button
              type="button"
              className={cn(
                'inline-flex items-center h-7 px-2.5 text-xs rounded-sm font-medium transition-colors',
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-3 w-3 mr-1" />
              {item.label}
            </button>
          </Link>
        );
      })}
    </div>
  );
}
