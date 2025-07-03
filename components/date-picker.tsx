'use client';

import * as React from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';

interface DatePickerDemoProps {
  value?: string; // Date initiale sous forme de string ISO
  onChange?: (value: string) => void; // Fonction pour transmettre la date sélectionnée au parent
  id?: string; // ID pour identification ou accessibilité
  className?: string; // Permet de personnaliser la largeur du bouton
}

export function DatePickerDemo({ value, onChange, id, className }: DatePickerDemoProps) {
  const [date, setDate] = React.useState<Date | undefined>();

  const handleDateChange = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0]; // Extrait uniquement la partie date.
      setDate(selectedDate);
      onChange?.(formattedDate); // Passe la date formatée au parent.
    } else {
      setDate(undefined); // Réinitialise la sélection si nécessaire.
      onChange?.(''); // Optionnel : indique au parent que la date est réinitialisée.
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            className || 'w-[240px]'
          )}
        >
          <CalendarIcon />
          {date ? format(date, 'yyyy-MM-dd') : <span>Date...</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date || (value ? new Date(value) : undefined)} // Définit la date sélectionnée ou undefined.
          onSelect={handleDateChange} // Appelle la fonction pour gérer le changement.
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}