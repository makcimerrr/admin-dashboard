import React, { useEffect, useState } from 'react';

interface LastUpdateProps {
  lastUpdate: string | null;
  eventId: string;
}

const getTimeAgo = (time: string): string => {
  const now = new Date();
  const updatedTime = new Date(time);

  // Corriger le décalage horaire si nécessaire
  const timeOffset = now.getTimezoneOffset() * 60 * 1000; // Décalage en millisecondes
  const diff = Math.floor((now.getTime() - updatedTime.getTime() + timeOffset) / 1000); // Différence ajustée

  const minutes = Math.floor(diff / 60);
  const hours = Math.floor(diff / 3600);
  const days = Math.floor(diff / 86400);

  if (days > 0) return `${days} jour${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} heure${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return `${diff} seconde${diff > 1 ? 's' : ''} ago`;
};

const LastUpdate = ({ lastUpdate, eventId }: LastUpdateProps) => {
  const [timeAgo, setTimeAgo] = useState<string | null>(null);

  useEffect(() => {
    if (!lastUpdate) return;

    // Fonction pour recalculer le temps écoulé
    const updateTimeAgo = () => {
      setTimeAgo(getTimeAgo(lastUpdate));
    };

    // Mettre à jour immédiatement
    updateTimeAgo();

    // Mettre à jour chaque seconde
    const interval = setInterval(updateTimeAgo, 1000);

    // Nettoyer l'intervalle à la destruction du composant
    return () => clearInterval(interval);
  }, [lastUpdate]);

  return (
    <div className="mt-2 text-sm text-gray-600">
      {lastUpdate ? (
        <p>
          Dernière mise à jour pour la promo {eventId} : {timeAgo}
        </p>
      ) : (
        eventId === 'all' ? (
          <p>Aucune mise à jour pour toutes les promos.</p>
        ) : (
        <p>Aucune mise à jour pour la promo {eventId}.</p>
        )
      )}
    </div>
  );
};

export default LastUpdate;