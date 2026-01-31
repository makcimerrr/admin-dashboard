"use client";

import React, { useEffect, useState } from 'react';

interface FiltersProps {
  tracks: string[];
}

export default function GroupFilters({ tracks }: FiltersProps) {
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-group-card]'));

    cards.forEach((card) => {
      const cardTrack = card.dataset.track ?? '';
      const cardStatus = card.dataset.status ?? '';
      const title = (card.querySelector('.group-title') as HTMLElement)?.innerText ?? '';

      const matchesTrack = selectedTrack === 'all' || cardTrack === selectedTrack;
      const matchesStatus = selectedStatus === 'all' || cardStatus === selectedStatus;
      const matchesSearch = !search || title.toLowerCase().includes(search.toLowerCase());

      if (matchesTrack && matchesStatus && matchesSearch) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
  }, [selectedTrack, selectedStatus, search]);

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Track</label>
        <select value={selectedTrack} onChange={(e) => setSelectedTrack(e.target.value)} className="px-2 py-1 border rounded">
          <option value="all">Toutes</option>
          {tracks.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Statut</label>
        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="px-2 py-1 border rounded">
          <option value="all">Tous</option>
          <option value="pending">En attente</option>
          <option value="audited">Audité</option>
        </select>
      </div>

      <div className="flex items-center gap-2 flex-1">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher projet ou groupe..." className="flex-1 px-3 py-1 border rounded" />
      </div>

      <button onClick={() => { setSelectedTrack('all'); setSelectedStatus('all'); setSearch(''); }} className="px-3 py-1 border rounded">Réinitialiser</button>
    </div>
  );
}
