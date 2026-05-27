'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface LastUpdateProps {
  lastUpdate: string | null;
  eventId: string;
  allUpdate?: string | null;
  isAuto?: boolean;
  allIsAuto?: boolean;
  outOfDeltaPromos?: { promo: string; date: string }[];
}

function formatRelative(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const tzOffset = new Date().getTimezoneOffset() * 60 * 1000;
  const diffSec = Math.max(0, Math.floor((now - t + tzOffset) / 1000));
  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor(diffSec / 60);
  if (days > 0) return `il y a ${days} jour${days > 1 ? 's' : ''}`;
  if (hours > 0) return `il y a ${hours} heure${hours > 1 ? 's' : ''}`;
  if (minutes > 0) return `il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
  return `il y a ${diffSec} seconde${diffSec > 1 ? 's' : ''}`;
}

function AutoBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/15 text-primary">
      <Sparkles className="h-2.5 w-2.5" />
      MAJ AUTO
    </span>
  );
}

const LastUpdate = ({
  lastUpdate,
  eventId,
  allUpdate,
  isAuto,
  allIsAuto,
  outOfDeltaPromos,
}: LastUpdateProps) => {
  const [, tick] = useState(0);

  // Re-render every minute to refresh the relative time string. 1s was
  // wasteful — the smallest unit shown is "X seconde(s)" and the user
  // doesn't actually need second-precision past the first minute.
  useEffect(() => {
    const id = setInterval(() => tick((v) => v + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const timeAgoLast = lastUpdate ? formatRelative(lastUpdate) : null;
  const timeAgoAll = allUpdate ? formatRelative(allUpdate) : null;

  // Which timestamp is the most recent?
  const updateType: 'lastUpdate' | 'allUpdate' | null = (() => {
    if (lastUpdate && allUpdate) {
      return new Date(lastUpdate).getTime() > new Date(allUpdate).getTime()
        ? 'lastUpdate'
        : 'allUpdate';
    }
    return lastUpdate ? 'lastUpdate' : allUpdate ? 'allUpdate' : null;
  })();

  const isAll = eventId === 'all';
  const hasOutOfDelta = outOfDeltaPromos && outOfDeltaPromos.length > 0;

  return (
    <div className="mt-2 text-sm text-muted-foreground">
      {isAll ? (
        hasOutOfDelta ? (
          <p className="flex flex-wrap items-center gap-1">
            <span>
              Dernière mise à jour de toutes les promotions {timeAgoLast}
            </span>
            {isAuto && <AutoBadge />}
            <span>
              mais les promos{' '}
              {outOfDeltaPromos!.map((p, idx) => (
                <span key={p.promo}>
                  <span className="font-medium text-foreground">{p.promo}</span>{' '}
                  ({formatRelative(p.date)})
                  {idx < outOfDeltaPromos!.length - 1 ? ', ' : ''}
                </span>
              ))}{' '}
              ont été mises à jour à des dates différentes.
            </span>
          </p>
        ) : timeAgoLast ? (
          <p className="flex items-center flex-wrap gap-1">
            Dernière mise à jour pour toutes les promotions : {timeAgoLast}
            {isAuto && <AutoBadge />}
          </p>
        ) : timeAgoAll ? (
          <p className="flex items-center flex-wrap gap-1">
            Dernière mise à jour pour toutes les promos : {timeAgoAll}
            {allIsAuto && <AutoBadge />}
          </p>
        ) : (
          <p>Aucune mise à jour pour toutes les promos.</p>
        )
      ) : updateType === 'lastUpdate' ? (
        <p className="flex items-center flex-wrap gap-1">
          Dernière mise à jour pour la promo <span className="font-medium text-foreground">{eventId}</span> : {timeAgoLast}
          {isAuto && <AutoBadge />}
        </p>
      ) : updateType === 'allUpdate' ? (
        <p className="flex items-center flex-wrap gap-1">
          Dernière mise à jour pour toutes les promos : {timeAgoAll}
          {allIsAuto && <AutoBadge />}
        </p>
      ) : (
        <p>Aucune mise à jour pour la promo {eventId}.</p>
      )}
    </div>
  );
};

export default LastUpdate;
