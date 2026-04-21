'use client';

import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';
import { NAV_APPS, filterAppsByRole } from '@/lib/nav-apps';

interface NonAdminLandingProps {
  userName?: string;
  role?: string;
}

export function NonAdminLanding({ userName, role }: NonAdminLandingProps) {
  const apps = filterAppsByRole(NAV_APPS, role);

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-4 py-12">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold mb-2">
            Bonjour{userName ? `, ${userName.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            Choisissez une application pour commencer.
          </p>
        </div>

        {apps.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            Aucune application disponible.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {apps.map((app) => {
              const Icon = app.icon;
              const href = app.url ?? app.defaultUrl ?? '#';
              const content = (
                <Card className="border transition-all hover:border-primary/30 hover:shadow-md cursor-pointer">
                  <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                    <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex items-center gap-1 text-sm font-medium">
                      {app.label}
                      {app.external && <ExternalLink className="h-3 w-3 opacity-50" />}
                    </div>
                  </CardContent>
                </Card>
              );

              return app.external ? (
                <a key={app.key} href={href} target="_blank" rel="noopener noreferrer">
                  {content}
                </a>
              ) : (
                <a key={app.key} href={href}>
                  {content}
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
