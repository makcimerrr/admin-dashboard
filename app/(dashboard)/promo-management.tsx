'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PromoTable from './promo-table';
import Modal from '@/components/ui/modal';
import { toast } from 'react-hot-toast';

interface Promo {
  key: string;
  eventId: number;
  title: string;
  dates: {
    start: string;
    'piscine-js-start': string;
    'piscine-js-end': string;
    'piscine-rust-start': string;
    'piscine-rust-end': string;
    end: string;
  };
}

export default function PromoManager() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [newPromo, setNewPromo] = useState<Promo>({
    key: '',
    eventId: 0,
    title: '',
    dates: {
      start: '',
      'piscine-js-start': '',
      'piscine-js-end': '',
      'piscine-rust-start': '',
      'piscine-rust-end': '',
      end: ''
    }
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<string | null>(null);
  const [deletionToast, setDeletionToast] = useState<string | undefined>(undefined);

  // Fetch promotions on component mount
  useEffect(() => {
    async function fetchPromos() {
      try {
        const response = await fetch('/api/promos'); // Use the GET endpoint
        if (!response.ok) {
          throw new Error('Unable to fetch promotions');
        }

        const data = await response.json();
        setPromos(data.promos); // Assuming the response contains an array of promos
      } catch (error) {
        console.error('Error fetching promotions:', error);
        toast.error('Impossible de récupérer les promotions.');
      }
    }

    fetchPromos();
  }, []);

  const handleAdd = async () => {
    if (
      !newPromo.key ||
      !newPromo.eventId ||
      !newPromo.title ||
      !newPromo.dates.start ||
      !newPromo.dates.end
    ) {
      toast.error('Certains champs obligatoires sont manquants (clé, ID, titre, début ou fin).');
      return;
    }

    try {
      const response = await fetch('/api/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPromo),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Une erreur est survenue.');
        return;
      }

      toast.success('Promotion ajoutée avec succès.');
      setPromos((prev) => [...prev, newPromo]);
      setNewPromo({
        key: '',
        eventId: 0,
        title: '',
        dates: {
          start: '',
          'piscine-js-start': '',
          'piscine-js-end': '',
          'piscine-rust-start': '',
          'piscine-rust-end': '',
          end: ''
        }
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout :', error);
      toast.error('Impossible d’ajouter la promotion. Veuillez réessayer.');
    }
  };

  const handleDelete = (key: string) => {
    setIsConfirmingDelete(key);
    const confirmationToastId = toast.loading('Confirmer la suppression...', {
      duration: Infinity,
    });
    setDeletionToast(confirmationToastId);
  };

  const confirmDelete = async (key: string) => {
    try {
      const response = await fetch('/api/promos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Une erreur est survenue.');
        return;
      }

      setPromos((prev) => prev.filter((promo) => promo.key !== key));
      toast.success('Promotion supprimée avec succès.');
      setIsConfirmingDelete(null);
    } catch (error) {
      console.error('Erreur lors de la suppression :', error);
      toast.error('Impossible de supprimer la promotion. Veuillez réessayer.');
    } finally {
      toast.dismiss(deletionToast);
    }
  };

  const cancelDelete = () => {
    setIsConfirmingDelete(null);
    toast.dismiss(deletionToast);
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="p-6">
      <div className="flex gap-4 mb-4">
        <Input
          placeholder="Clé (e.g., P1 2024)"
          value={newPromo.key}
          onChange={(e) => setNewPromo((prev) => ({ ...prev, key: e.target.value }))}
        />
        <Input
          type="number"
          placeholder="ID de l'événement"
          value={newPromo.eventId}
          onChange={(e) => setNewPromo((prev) => ({ ...prev, eventId: Number(e.target.value) }))}
        />
        <Input
          placeholder="Titre"
          value={newPromo.title}
          onChange={(e) => setNewPromo((prev) => ({ ...prev, title: e.target.value }))}
        />
        <Button onClick={openModal}>Configurer les Dates</Button>
        <Button onClick={handleAdd}>Ajouter</Button>
      </div>

      <PromoTable
        promos={promos}
        onDelete={handleDelete}
        isConfirmingDelete={isConfirmingDelete}
        cancelDelete={cancelDelete}
        confirmDelete={confirmDelete}
      />

      {/* Modal des dates */}
      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <div>
          <div className="mb-4">
            <label>Date de début</label>
            <Input
              type="date"
              value={newPromo.dates.start}
              onChange={(e) => setNewPromo((prev) => ({
                ...prev,
                dates: { ...prev.dates, start: e.target.value }
              }))}
            />
          </div>
          <div className="mb-4">
            <label>Piscine JS Start (optionnel)</label>
            <Input
              type="date"
              value={newPromo.dates['piscine-js-start']}
              onChange={(e) => setNewPromo((prev) => ({
                ...prev,
                dates: { ...prev.dates, 'piscine-js-start': e.target.value }
              }))}
            />
          </div>
          <div className="mb-4">
            <label>Piscine JS End (optionnel)</label>
            <Input
              type="date"
              value={newPromo.dates['piscine-js-end']}
              onChange={(e) => setNewPromo((prev) => ({
                ...prev,
                dates: { ...prev.dates, 'piscine-js-end': e.target.value }
              }))}
            />
          </div>
          <div className="mb-4">
            <label>Piscine Rust Start (optionnel)</label>
            <Input
              type="date"
              value={newPromo.dates['piscine-rust-start']}
              onChange={(e) => setNewPromo((prev) => ({
                ...prev,
                dates: { ...prev.dates, 'piscine-rust-start': e.target.value }
              }))}
            />
          </div>
          <div className="mb-4">
            <label>Piscine Rust End (optionnel)</label>
            <Input
              type="date"
              value={newPromo.dates['piscine-rust-end']}
              onChange={(e) => setNewPromo((prev) => ({
                ...prev,
                dates: { ...prev.dates, 'piscine-rust-end': e.target.value }
              }))}
            />
          </div>
          <div className="mb-4">
            <label>Date de fin</label>
            <Input
              type="date"
              value={newPromo.dates.end}
              onChange={(e) => setNewPromo((prev) => ({
                ...prev,
                dates: { ...prev.dates, end: e.target.value }
              }))}
            />
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={closeModal}>Fermer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}