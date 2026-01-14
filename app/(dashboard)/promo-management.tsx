'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PromoTable from './promo-table';
import Modal from '@/components/ui/modal';
import { toast } from 'react-hot-toast';
import { DatePickerDemo } from '@/components/date-picker';

interface Promo {
  key: string;
  eventId: number;
  title: string;
  dates: {
    start: string;
    'piscine-js-start': string;
    'piscine-js-end': string;
    'piscine-rust-java-start': string;
    'piscine-rust-java-end': string;
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
      'piscine-rust-java-start': '',
      'piscine-rust-java-end': '',
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
          'piscine-rust-java-start': '',
          'piscine-rust-java-end': '',
          end: ''
        }
      });
      setIsModalOpen(false);
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
      <h1 className="text-3xl font-semibold mb-6">Gestion des Promotions</h1>
      <div className="flex gap-6 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Clé (e.g., P1 2024)"
            value={newPromo.key}
            onChange={(e) =>
              setNewPromo((prev) => ({ ...prev, key: e.target.value }))
            }
            className="border p-3 rounded-md w-full focus:ring-2 focus:ring-primary transition"
          />
        </div>
        <div className="flex-1">
          <Input
            type="number"
            placeholder="ID de l'événement"
            value={newPromo.eventId}
            onChange={(e) =>
              setNewPromo((prev) => ({ ...prev, eventId: Number(e.target.value) }))
            }
            className="border p-3 rounded-md w-full focus:ring-2 focus:ring-primary transition"
          />
        </div>
        <div className="flex-1">
          <Input
            placeholder="Titre"
            value={newPromo.title}
            onChange={(e) =>
              setNewPromo((prev) => ({ ...prev, title: e.target.value }))
            }
            className="border p-3 rounded-md w-full focus:ring-2 focus:ring-primary transition"
          />
        </div>

        <Button
          onClick={openModal}
          className="px-6 py-3 bg-primary rounded-md hover:bg-primary-dark focus:ring-2 focus:ring-primary transition"
        >
          Configurer les Dates
        </Button>
      </div>

      <PromoTable
        promos={promos}
        onDelete={handleDelete}
        isConfirmingDelete={isConfirmingDelete}
        cancelDelete={cancelDelete}
        confirmDelete={confirmDelete}
      />

      <Modal isOpen={isModalOpen}>
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Configurer les Dates</h3>
            <button
              onClick={() => setIsModalOpen(false)}
              className="text-gray-600 hover:text-gray-900"
              aria-label="Fermer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mb-4">
            <label htmlFor="start-date" className="block text-sm font-medium">Date de début</label>
            <DatePickerDemo
              value={newPromo.dates.start}
              onChange={date => setNewPromo((prev) => ({
                ...prev,
                dates: { ...prev.dates, start: date }
              }))}
              id="start-date"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="start-date-js" className="block text-sm font-medium">Piscine JS Start (optionnel)</label>
            <DatePickerDemo
              value={newPromo.dates['piscine-js-start']}
              onChange={date => setNewPromo((prev) => ({
                ...prev,
                dates: { ...prev.dates, 'piscine-js-start': date }
              }))}
              id="start-date-js"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="end-date-js" className="block text-sm font-medium">Piscine JS End (optionnel)</label>
            <DatePickerDemo
              value={newPromo.dates['piscine-js-end']}
              onChange={date => setNewPromo((prev) => ({
                ...prev,
                dates: { ...prev.dates, 'piscine-js-end': date }
              }))}
              id="end-date-js"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="start-date-rust-java" className="block text-sm font-medium">Piscine Rust/Java Start (optionnel)</label>
            <DatePickerDemo
              value={newPromo.dates['piscine-rust-java-start']}
              onChange={date => setNewPromo((prev) => ({
                ...prev,
                dates: { ...prev.dates, 'piscine-rust-java-start': date }
              }))}
              id="start-date-rust-java"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="end-date-rust-java" className="block text-sm font-medium">Piscine Rust/Java End (optionnel)</label>
            <DatePickerDemo
              value={newPromo.dates['piscine-rust-java-end']}
              onChange={date => setNewPromo((prev) => ({
                ...prev,
                dates: { ...prev.dates, 'piscine-rust-java-end': date }
              }))}
              id="end-date-rust-java"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="end-date" className="block text-sm font-medium">Date de fin</label>
            <DatePickerDemo
              value={newPromo.dates.end}
              onChange={date => setNewPromo((prev) => ({
                ...prev,
                dates: { ...prev.dates, end: date }
              }))}
              id="end-date"
            />
          </div>
          <div className="flex justify-end mt-4 space-x-4">
            <Button onClick={handleAdd}>Ajouter</Button>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Annuler</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}