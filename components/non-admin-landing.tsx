'use client';

import { EmargementWidget } from '@/components/student/emargement-widget';
import { DeckWidget } from '@/components/student/deck-widget';
import { IntraWidget } from '@/components/student/intra-widget';
import { Sparkles } from 'lucide-react';

interface NonAdminLandingProps {
  userName?: string;
  role?: string;
}

export function NonAdminLanding({ userName }: NonAdminLandingProps) {
  const firstName = userName?.split(' ')[0];

  return (
    <div className="h-full flex flex-col gap-3 p-3 md:p-4 overflow-hidden">
      {/* Welcome header (compact) */}
      <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            Bonjour{firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <p className="text-xs text-muted-foreground">
            Récap de ta progression cette semaine.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-700 text-[10px] font-medium">
          <Sparkles className="h-3 w-3" />
          Données mockées
        </div>
      </div>

      {/* Grid: 3 widgets en row, emargement plus large */}
      <div className="flex-1 min-h-0 grid gap-3 grid-cols-1 md:grid-cols-12">
        <div className="md:col-span-5 min-h-0">
          <EmargementWidget />
        </div>
        <div className="md:col-span-4 min-h-0">
          <IntraWidget />
        </div>
        <div className="md:col-span-3 min-h-0">
          <DeckWidget />
        </div>
      </div>
    </div>
  );
}
