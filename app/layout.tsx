import './globals.css';

import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { Toaster as HotToaster } from 'react-hot-toast';
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
            <SonnerToaster />
            <HotToaster
              position="top-center"
              containerStyle={{ top: 16 }}
              toastOptions={{
                className: 'text-sm',
                style: {
                  background: 'hsl(var(--background))',
                  color: 'hsl(var(--foreground))',
                  border: '1px solid hsl(var(--border))',
                },
              }}
            />
          </Providers>
        </body>
        </html>
    );
}