'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Modal from '@/components/ui/modal';
import { toast } from 'react-hot-toast';
import { DatePickerDemo } from '@/components/date-picker';

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

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const response = await fetch('/api/holidays');
        const data = await response.json();
        if (data.success && data.data) {
          const holidaysArray = Object.entries(data.data).map(
            ([name, dates]) => {
              const dateRanges = dates as DateRange[];
              return {
                name,
                start: dateRanges[0].start,
                end: dateRanges[0].end,
              };
            }
          );
          setHolidays(holidaysArray);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des vacances :', error);
      }
    };

    fetchHolidays();
  }, []);

  const handleAddHoliday = async () => {
    const { name, start, end } = newHoliday;

    if (!name || !start || !end) {
      toast.error('Veuillez remplir tous les champs.');
      return;
    }

    if (holidays.some((holiday) => holiday.name === name)) {
      toast.error('Une vacance avec ce nom existe deja.');
      return;
    }

    if (start >= end) {
      toast.error('La date de fin doit venir apres la date de debut.');
      return;
    }

    if (new Date(start).getTime() - new Date(end).getTime() > 0) {
      toast.error('La date de début doit être avant la date de fin.');
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
      <h1 className="text-3xl font-semibold mb-6">Gestion des Vacances</h1>

      <Button
        onClick={() => setIsModalOpen(true)}
        className="bg-primary font-semibold py-2 px-6 rounded-lg hover:bg-primary-dark transition duration-200 mb-6"
      >
        Ajouter une Vacance
      </Button>

      <ul className="mt-4 space-y-4">
        {holidays.map(({ name, start, end }) => (
          <li
            key={name}
            className="flex justify-between items-center p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm hover:shadow-md transition-all"
          >
            <div className="text-lg font-medium">
              <strong>{name}</strong> : {start} - {end}
            </div>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDeleteHoliday(name)}
              className="text-sm text-red-200 hover:text-red-800 transition-colors"
            >
              Supprimer
            </Button>
          </li>
        ))}
      </ul>

      {/* Modal */}
      <Modal isOpen={isModalOpen}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Ajouter une Vacance</h3>
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

        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              Nom
            </label>
            <Input
              id="name"
              placeholder="Nom des vacances (e.g., Été 2025)"
              value={newHoliday.name}
              onChange={(e) =>
                setNewHoliday((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>
          <div>
            <label htmlFor="start" className="block text-sm font-medium">
              Date de début
            </label>
            <DatePickerDemo
              value={newHoliday.start} // Date initiale
              onChange={(date) => setNewHoliday((prev) => ({ ...prev, start: date }))}
              id="start-date-picker"
            />
          </div>
          <div>
            <label htmlFor="end" className="block text-sm font-medium">
              Date de fin
            </label>
            <DatePickerDemo
              value={newHoliday.end} // Date initiale
              onChange={(date) => setNewHoliday((prev) => ({ ...prev, end: date }))}
              id="end-date-picker"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-4 mt-6">
          <Button
            onClick={() => {
              handleAddHoliday();
              setIsModalOpen(false);
            }}
            className="bg-primary"
          >
            Ajouter
          </Button>
          <Button
            variant="secondary"
            onClick={() => setIsModalOpen(false)}
          >
            Annuler
          </Button>
        </div>
      </Modal>
    </div>
  );
}