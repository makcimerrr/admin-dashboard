import React, { useEffect, useState } from 'react';

interface LastUpdateProps {
  lastUpdate: string | null;
  eventId: string;
  allUpdate?: string | null; // Prop pour la dernière mise à jour de la promo 'all'
}

const getTimeAgo = (time: string): string => {
  const now = new Date();
  const updatedTime = new Date(time);

  const timeOffset = now.getTimezoneOffset() * 60 * 1000; // Décalage en millisecondes
  const diff = Math.floor(
    (now.getTime() - updatedTime.getTime() + timeOffset) / 1000
  ); // Différence ajustée

  const minutes = Math.floor(diff / 60);
  const hours = Math.floor(diff / 3600);
  const days = Math.floor(diff / 86400);

  if (days > 0) return `${days} jour${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} heure${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return `${diff} seconde${diff > 1 ? 's' : ''} ago`;
};

const LastUpdate = ({ lastUpdate, eventId, allUpdate }: LastUpdateProps) => {
  const [timeAgo, setTimeAgo] = useState<string | null>(null);
  const [timeAgoAll, setTimeAgoAll] = useState<string | null>(null);

  useEffect(() => {
    if (lastUpdate) {
      // Recalculer le temps écoulé pour la promo actuelle
      setTimeAgo(getTimeAgo(lastUpdate));
    }

    if (allUpdate) {
      // Recalculer le temps écoulé pour la promo 'all'
      setTimeAgoAll(getTimeAgo(allUpdate));
    }

    const interval = setInterval(() => {
      if (lastUpdate) setTimeAgo(getTimeAgo(lastUpdate));
      if (allUpdate) setTimeAgoAll(getTimeAgo(allUpdate));
    }, 1000);

    return () => clearInterval(interval); // Nettoyer à la destruction du composant
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
            <p>
              Dernière mise à jour pour la promo {eventId} : {timeAgo}
            </p>
          ) : (
            <>
              {updateType === 'allUpdate' ? (
                <p>
                  Dernière mise à jour pour toutes les promos : {timeAgoAll}
                </p>
              ) : (
                <p>Aucune mise à jour pour la promo {eventId}.</p>
              )}
            </>
          )}
        </>
      ) : (
        <>
          {updateType === 'allUpdate' ? (
            <p>Dernière mise à jour pour toutes les promos : {timeAgoAll}</p>
          ) : (
            <p>Aucune mise à jour pour toutes les promos.</p>
          )}
        </>
      )}
    </div>
  );
};

export default LastUpdate;