import React from 'react';

interface LastUpdateProps {
  lastUpdate: string | null;
  eventId: string;
}

const getTimeAgo = (time: string): string => {
  const now = new Date();
  const updatedTime = new Date(time);
  const diff = Math.floor((now.getTime() - updatedTime.getTime()) / 1000); // Différence en secondes

  const minutes = Math.floor(diff / 60);
  const hours = Math.floor(diff / 3600);
  const days = Math.floor(diff / 86400);

  if (days > 0) return `${days} jour${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} heure${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return `${diff} seconde${diff > 1 ? 's' : ''} ago`;
};

const LastUpdate = ({ lastUpdate, eventId }: LastUpdateProps) => {
  return (
    <div className="mt-2 text-sm text-gray-600">
      {lastUpdate ? (
        <p>
          Dernière mise à jour pour la promo {eventId} : {getTimeAgo(lastUpdate)}
        </p>
      ) : (
        <p>Aucune mise à jour pour cette promotion.</p>
      )}
    </div>
  );
};

export default LastUpdate;