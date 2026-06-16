'use client';

import { useRouter } from 'next/navigation';
import { Eye, ArrowLeft } from 'lucide-react';
import { EmargementWidget } from '@/components/student/emargement-widget';
import { DeckWidget } from '@/components/student/deck-widget';
import { IntraWidget } from '@/components/student/intra-widget';

interface NonAdminLandingProps {
  userName?: string;
  role?: string;
  /** Si défini : aperçu admin du hub de cet étudiant (login Zone01). */
  asLogin?: string;
  /** Nom affiché dans le bandeau d'aperçu. */
  previewName?: string;
}

export function NonAdminLanding({ userName, asLogin, previewName }: NonAdminLandingProps) {
  const router = useRouter();
  const firstName = userName?.split(' ')[0];
  const isPreview = Boolean(asLogin);

  return (
    <div className="h-full flex flex-col gap-3 p-3 md:p-4 overflow-hidden">
      {isPreview && (
        <div className="shrink-0 flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
          <span className="flex items-center gap-2 text-sm">
            <Eye className="h-4 w-4 text-primary shrink-0" />
            Aperçu du hub de <strong className="font-semibold">{previewName ?? asLogin}</strong>
          </span>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour
          </button>
        </div>
      )}

      {/* Welcome header (compact) — masqué en mode aperçu (bandeau à la place) */}
      {!isPreview && (
        <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              Bonjour{firstName ? `, ${firstName}` : ''} 👋
            </h1>
            <p className="text-xs text-muted-foreground">
              Récap de ta progression cette semaine.
            </p>
          </div>
        </div>
      )}

      {/* Layout: Emargement top full-width, then Deck | Intra below */}
      <div className="flex-1 min-h-0 grid gap-3 grid-rows-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="min-h-0">
          <EmargementWidget asLogin={asLogin} />
        </div>
        <div className="min-h-0 grid gap-3 md:grid-cols-2">
          <div className="min-h-0">
            <DeckWidget asLogin={asLogin} />
          </div>
          <div className="min-h-0">
            <IntraWidget asLogin={asLogin} />
          </div>
        </div>
      </div>
    </div>
  );
}
