'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { usePathname } from 'next/navigation';
import * as React from 'react';
import { Progress } from '@/components/ui/progress';
import {useEffect, useState} from "react";

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
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setProgress(10);

    let newProgress = 10;
    const timer = setInterval(() => {
      newProgress += Math.floor(Math.random() * (50 - 10 + 1)) + 15;
      setProgress(newProgress);
      if (newProgress >= 100) {
        clearInterval(timer);
        setTimeout(() => setLoading(false), 300);
      }
    }, 500);

    return () => {
      clearInterval(timer);
      setProgress(0);
    };
  }, [pathname]);

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
        <main className="flex-1 p-10">
          {loading ? (
            <Progress value={progress} className="w-[60%]" />
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
