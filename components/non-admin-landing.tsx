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
    <div className="page-container flex flex-col gap-4 md:gap-6 p-4 md:p-6">
      {/* Welcome header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Bonjour{firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Voici un récap de ta progression cette semaine.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-700 text-xs font-medium">
          <Sparkles className="h-3 w-3" />
          Données mockées · Intégration à venir
        </div>
      </div>

      {/* Row 1: Émargement (wide) */}
      <EmargementWidget />

      {/* Row 2: 01 Deck + Intra */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DeckWidget />
        <IntraWidget />
      </div>
    </div>
  );
}
