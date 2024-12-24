'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PromoTable from './promo-table';
import initialPromos from 'config/promoConfig.json';
import { toast } from 'react-hot-toast';

interface Promo {
  key: string;
  eventId: number;
  title: string;
}

export default function PromoManager() {
  const [promos, setPromos] = useState<Promo[]>(initialPromos);
  const [newPromo, setNewPromo] = useState({ key: '', eventId: '', title: '' });
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<string | null>(null);
  const [deletionToast, setDeletionToast] = useState<string | undefined>(undefined);

  const handleAdd = async () => {
    if (!newPromo.key || !newPromo.eventId || !newPromo.title) {
      toast.error('Tous les champs doivent être remplis.');
      return;
    }

    try {
      const response = await fetch('/api/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: newPromo.key,
          eventId: Number(newPromo.eventId),
          title: newPromo.title,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Une erreur est survenue.');
        return;
      }

      toast.success('Promotion ajoutée avec succès.');
      setPromos((prev) => [...prev, { ...newPromo, eventId: Number(newPromo.eventId) }]);
      setNewPromo({ key: '', eventId: '', title: '' });
    } catch (error) {
      console.error('Erreur lors de l\'ajout :', error);
      toast.error('Impossible d’ajouter la promotion. Veuillez réessayer.');
    }
  };

  // Fonction de suppression, déclenche le toast loading
  const handleDelete = (key: string) => {
    setIsConfirmingDelete(key);
    const confirmationToastId = toast.loading('Confirmer la suppression...', {
      duration: Infinity, // Durée infinie pour qu'il reste affiché jusqu'à confirmation
    });
    setDeletionToast(confirmationToastId);
  };

  // Confirmation de la suppression
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

      // Mettre à jour l'état promos avec la promo supprimée
      setPromos((prev) => prev.filter((promo) => promo.key !== key));
      toast.success('Promotion supprimée avec succès.');
      setIsConfirmingDelete(null); // Reset confirmation
    } catch (error) {
      console.error('Erreur lors de la suppression :', error);
      toast.error('Impossible de supprimer la promotion. Veuillez réessayer.');
    } finally {
      toast.dismiss(deletionToast); // Fermer le toast de confirmation
    }
  };

  // Annuler la suppression
  const cancelDelete = () => {
    setIsConfirmingDelete(null);
    toast.dismiss(deletionToast); // Fermer le toast de confirmation
  };

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
          onChange={(e) => setNewPromo((prev) => ({ ...prev, eventId: e.target.value }))}
        />
        <Input
          placeholder="Titre (e.g., Promotion 1 - Année 2024)"
          value={newPromo.title}
          onChange={(e) => setNewPromo((prev) => ({ ...prev, title: e.target.value }))}
        />
        <Button onClick={handleAdd}>Ajouter</Button>
      </div>

      <PromoTable
        promos={promos}
        onDelete={handleDelete}
        isConfirmingDelete={isConfirmingDelete}
        cancelDelete={cancelDelete}
        confirmDelete={confirmDelete}
      />
    </div>
  );
}