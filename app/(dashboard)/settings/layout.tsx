'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { usePathname } from 'next/navigation';
import * as React from 'react';

const menuItems = [
  { name: 'Profile', href: '/settings' },
  { name: 'Account', href: '/settings/account' },
  { name: 'Appearance', href: '/settings/appearance' },
  { name: 'Notifications', href: '/settings/notifications' },
  { name: 'Display', href: '/settings/display' }
];

export default function SettingsLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="hidden space-y-6 p-10 pb-16 md:block">
      {/* Title */}
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings and set e-mail preferences.
        </p>
      </div>
      <Separator />
      {/* Sidebar */}
      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="w-64 p-6">
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={item.href === pathname ? 'secondary' : 'ghost'}
                  className="w-full justify-start hover:underline"
                >
                  {item.name}
                </Button>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-10">{children}</main>
      </div>
    </div>
  );
}
