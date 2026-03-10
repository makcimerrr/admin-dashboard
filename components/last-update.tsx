import React, { useEffect, useState } from 'react';

interface LastUpdateProps {
  lastUpdate: string | null;
  eventId: string;
  allUpdate?: string | null;
  isAuto?: boolean; // Flag pour indiquer si la MAJ a été faite automatiquement
  allIsAuto?: boolean; // Flag pour la MAJ "all"
}

const getTimeAgo = (time: string): string => {
  const now = new Date();
  const updatedTime = new Date(time);

  const timeOffset = now.getTimezoneOffset() * 60 * 1000;
  const diff = Math.floor(
    (now.getTime() - updatedTime.getTime() + timeOffset) / 1000
  );

  const minutes = Math.floor(diff / 60);
  const hours = Math.floor(diff / 3600);
  const days = Math.floor(diff / 86400);

  if (days > 0) return `${days} jour${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} heure${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return `${diff} seconde${diff > 1 ? 's' : ''} ago`;
};

const AutoBadge = () => (
  <span className="inline-flex items-center ml-1.5 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
    ⚡ MAJ AUTO
  </span>
);

const LastUpdate = ({ lastUpdate, eventId, allUpdate, isAuto, allIsAuto, outOfDeltaPromos }: LastUpdateProps & { outOfDeltaPromos?: { promo: string; date: string }[] }) => {
  const [timeAgo, setTimeAgo] = useState<string | null>(null);
  const [timeAgoAll, setTimeAgoAll] = useState<string | null>(null);

  useEffect(() => {
    if (lastUpdate) {
      setTimeAgo(getTimeAgo(lastUpdate));
    }

    if (allUpdate) {
      setTimeAgoAll(getTimeAgo(allUpdate));
    }

    const interval = setInterval(() => {
      if (lastUpdate) setTimeAgo(getTimeAgo(lastUpdate));
      if (allUpdate) setTimeAgoAll(getTimeAgo(allUpdate));
    }, 1000);

    return () => clearInterval(interval);
  }, [lastUpdate, allUpdate]);

  const compareUpdates = () => {
    if (lastUpdate && allUpdate) {
      const lastUpdateTime = new Date(lastUpdate).getTime();
      const allUpdateTime = new Date(allUpdate).getTime();
      return lastUpdateTime > allUpdateTime ? 'lastUpdate' : 'allUpdate';
    }
    return lastUpdate ? 'lastUpdate' : allUpdate ? 'allUpdate' : null;
  };

  const updateType = compareUpdates();

  return (
    <div className="mt-2 text-sm text-gray-600">
      {eventId !== 'all' ? (
        <>
          {updateType === 'lastUpdate' ? (
            <p className="flex items-center flex-wrap gap-1">
              Dernière mise à jour pour la promo {eventId} : {timeAgo}
              {isAuto && <AutoBadge />}
            </p>
          ) : (
            <>
              {updateType === 'allUpdate' ? (
                <p className="flex items-center flex-wrap gap-1">
                  Dernière mise à jour pour toutes les promos : {timeAgoAll}
                  {allIsAuto && <AutoBadge />}
                </p>
              ) : (
                <p>Aucune mise à jour pour la promo {eventId}.</p>
              )}
            </>
          )}
        </>
      ) : (
        <>
          {outOfDeltaPromos && outOfDeltaPromos.length > 0 ? (
            <div>
              <p>
                Dernière mise à jour de toutes les promotions le {timeAgo} mais les promos&nbsp;
                {outOfDeltaPromos.map((p, idx) => (
                  <span key={p.promo}>
                    {p.promo} (le {getTimeAgo(p.date)}){idx < outOfDeltaPromos.length - 1 ? ', ' : ''}
                  </span>
                ))}
                ont été mises à jour à des dates différentes.
              </p>
            </div>
          ) : lastUpdate ? (
            <p className="flex items-center flex-wrap gap-1">
              Dernière mise à jour pour toutes les promotions : {timeAgo}
              {isAuto && <AutoBadge />}
            </p>
          ) : allUpdate ? (
            <p className="flex items-center flex-wrap gap-1">
              Dernière mise à jour pour toutes les promos : {timeAgoAll}
              {allIsAuto && <AutoBadge />}
            </p>
          ) : (
            <p>Aucune mise à jour pour toutes les promos.</p>
          )}
        </>
      )}
    </div>
  );
};

export default LastUpdate;