'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface FiltersProps {
  tracks: string[];
}

export default function GroupFilters({ tracks }: FiltersProps) {
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  // Filtrage des cartes
  useEffect(() => {
    const cards = Array.from(
      document.querySelectorAll<HTMLElement>('[data-group-card]')
    );

    cards.forEach((card) => {
      const cardTrack = card.dataset.track ?? '';
      const cardStatus = card.dataset.status ?? '';
      const title =
        (card.querySelector('.group-title') as HTMLElement)?.innerText ?? '';

      // Récupérer tous les noms d'étudiants
      const members = Array.from(
        card.querySelectorAll<HTMLElement>('.group-members > *')
      );
      const membersText = members.map((m) => m.innerText).join(' ');

      const matchesTrack =
        selectedTrack === 'all' || cardTrack === selectedTrack;
      const matchesStatus =
        selectedStatus === 'all' || cardStatus === selectedStatus;
      const matchesSearch =
        !search ||
        title.toLowerCase().includes(search.toLowerCase()) ||
        membersText.toLowerCase().includes(search.toLowerCase());

      card.style.display =
        matchesTrack && matchesStatus && matchesSearch ? '' : 'none';
    });
  }, [selectedTrack, selectedStatus, search]);

  const resetFilters = () => {
    setSelectedTrack('all');
    setSelectedStatus('all');
    setSearch('');
  };

  return (
    <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 mb-6">
      {/* Tracks */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Track:</span>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={selectedTrack === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedTrack('all')}
          >
            Toutes
          </Button>
          {tracks.map((t) => (
            <Button
              key={t}
              size="sm"
              variant={selectedTrack === t ? 'default' : 'outline'}
              onClick={() => setSelectedTrack(t)}
            >
              {t}
            </Button>
          ))}
        </div>
      </div>

      {/* Statut */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Statut:</span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={selectedStatus === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedStatus('all')}
          >
            Tous
          </Button>
          <Button
            size="sm"
            variant={selectedStatus === 'pending' ? 'default' : 'outline'}
            onClick={() => setSelectedStatus('pending')}
          >
            En attente
          </Button>
          <Button
            size="sm"
            variant={selectedStatus === 'audited' ? 'default' : 'outline'}
            onClick={() => setSelectedStatus('audited')}
          >
            Audité
          </Button>
        </div>
      </div>

      {/* Recherche */}
      <div className="flex-1 min-w-[200px]">
        <Input
          placeholder="Rechercher projet ou login..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Reset */}
      <Button
        size="sm"
        variant="outline"
        className="ml-auto"
        onClick={resetFilters}
      >
        Réinitialiser
      </Button>
    </div>
  );
}
