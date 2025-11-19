import './globals.css';

import { Analytics } from '@vercel/analytics/react';
import { Toaster } from '@/components/ui/toaster';
import { Providers } from './providers';

export const metadata = {
    title: 'Zone01 Admin Dashboard',
    description:
        'A user admin dashboard configured with Next.js, Postgres, NextAuth, Tailwind CSS, TypeScript, and Prettier.'
};

export default function RootLayout({
                                       children
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
        <body className="flex min-h-screen w-full flex-col">
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </body>
        <Analytics />
        </html>
    );
}