'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Modal from '@/components/ui/modal';
import { toast } from 'react-hot-toast';

interface Holiday {
  name: string;
  start: string;
  end: string;
}
interface DateRange {
  start: string;
  end: string;
}

export default function HolidayManager() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [newHoliday, setNewHoliday] = useState<Holiday>({
    name: '',
    start: '',
    end: '',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Ensure holidays are fetched correctly from the API or initial data.
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const response = await fetch('/api/holidays');
        const data = await response.json();
        if (data.success && data.data) {
          const holidaysArray = Object.entries(data.data).map(([name, dates]) => {
            const dateRanges = dates as DateRange[];
            return {
              name,
              start: dateRanges[0].start,
              end: dateRanges[0].end,
            };
          });
          setHolidays(holidaysArray);
        } else {
          console.error('Failed to fetch holidays');
        }
      } catch (error) {
        console.error('Error fetching holidays:', error);
      }
    };

    fetchHolidays();
  }, []); // Run only once on component mount.

  const handleAddHoliday = async () => {
    const { name, start, end } = newHoliday;

    if (!name || !start || !end) {
      toast.error('Veuillez remplir tous les champs.');
      return;
    }

    try {
      const response = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, start, end }),
      });
      const data = await response.json();
      if (data.success) {
        setHolidays((prev) => [...prev, { name, start, end }]);
        setNewHoliday({ name: '', start: '', end: '' });
        toast.success('Vacance ajoutée avec succès.');
      } else {
        toast.error(data.message || 'Impossible d’ajouter la vacance.');
      }
    } catch (error) {
      console.error('Erreur lors de l’ajout :', error);
      toast.error('Impossible d’ajouter la vacance.');
    }
  };

  const handleDeleteHoliday = async (name: string) => {
    try {
      const response = await fetch('/api/holidays', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (data.success) {
        setHolidays((prev) => prev.filter((holiday) => holiday.name !== name));
        toast.success('Vacance supprimée avec succès.');
      } else {
        toast.error(data.message || 'Impossible de supprimer la vacance.');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression :', error);
      toast.error('Impossible de supprimer la vacance.');
    }
  };

  return (
    <div className="p-6">
      <Button onClick={() => setIsModalOpen(true)}>Ajouter une Vacance</Button>

      <ul className="mt-4">
        {holidays.map(({ name, start, end }) => (
          <li key={name} className="mb-2 flex items-center justify-between">
            <div>
              <strong>{name}</strong>: {start} - {end}
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDeleteHoliday(name)}
            >
              Supprimer
            </Button>
          </li>
        ))}
      </ul>

      {/* Modal pour ajouter une vacance */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div>
          <h3 className="text-lg font-bold mb-4">Ajouter une Vacance</h3>
          <div className="mb-4">
            <label>Nom</label>
            <Input
              placeholder="Nom des vacances (e.g., Été 2025)"
              value={newHoliday.name}
              onChange={(e) =>
                setNewHoliday((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>
          <div className="mb-4">
            <label>Date de début</label>
            <Input
              type="date"
              value={newHoliday.start}
              onChange={(e) =>
                setNewHoliday((prev) => ({ ...prev, start: e.target.value }))
              }
            />
          </div>
          <div className="mb-4">
            <label>Date de fin</label>
            <Input
              type="date"
              value={newHoliday.end}
              onChange={(e) =>
                setNewHoliday((prev) => ({ ...prev, end: e.target.value }))
              }
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => {
                handleAddHoliday();
                setIsModalOpen(false);
              }}
            >
              Ajouter
            </Button>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}