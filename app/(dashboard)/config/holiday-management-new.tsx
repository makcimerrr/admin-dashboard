'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Plane, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { DatePickerDemo } from '@/components/date-picker';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Holiday {
  name: string;
  start: string;
  end: string;
}

interface DateRange {
  start: string;
  end: string;
}

export default function HolidayManagement() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteHoliday, setDeleteHoliday] = useState<string | null>(null);
  const [newHoliday, setNewHoliday] = useState<Holiday>({
    name: '',
    start: '',
    end: '',
  });

  useEffect(() => {
    fetchHolidays();
  }, []);

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
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des vacances :', error);
      toast.error('Impossible de charger les vacances.');
    }
  };

  const handleAdd = async () => {
    const { name, start, end } = newHoliday;

    if (!name || !start || !end) {
      toast.error('Veuillez remplir tous les champs.');
      return;
    }

    if (holidays.some((holiday) => holiday.name === name)) {
      toast.error('Une vacance avec ce nom existe déjà.');
      return;
    }

    if (new Date(start) >= new Date(end)) {
      toast.error('La date de fin doit être après la date de début.');
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
        toast.success('Vacance ajoutée avec succès.');
        await fetchHolidays();
        setNewHoliday({ name: '', start: '', end: '' });
        setIsDialogOpen(false);
      } else {
        toast.error(data.message || 'Impossible d\'ajouter la vacance.');
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout :', error);
      toast.error('Impossible d\'ajouter la vacance.');
    }
  };

  const handleDelete = async (name: string) => {
    try {
      const response = await fetch('/api/holidays', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Vacance supprimée avec succès.');
        await fetchHolidays();
        setDeleteHoliday(null);
      } else {
        toast.error(data.message || 'Impossible de supprimer la vacance.');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression :', error);
      toast.error('Impossible de supprimer la vacance.');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd MMM yyyy', { locale: fr });
    } catch {
      return dateString;
    }
  };

  const getDuration = (start: string, end: string) => {
    try {
      const days = differenceInDays(new Date(end), new Date(start));
      return `${days} jour${days > 1 ? 's' : ''}`;
    } catch {
      return '-';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header avec bouton d\'ajout */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Périodes de vacances</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {holidays.length} période{holidays.length > 1 ? 's' : ''} configurée{holidays.length > 1 ? 's' : ''}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle période
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter une période de vacances</DialogTitle>
              <DialogDescription>
                Définissez une nouvelle période de vacances ou de congés
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de la période *</Label>
                <Input
                  id="name"
                  placeholder="ex: Vacances d\'été 2025"
                  value={newHoliday.name}
                  onChange={(e) => setNewHoliday((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Date de début *</Label>
                <DatePickerDemo
                  value={newHoliday.start}
                  onChange={(date) => setNewHoliday((prev) => ({ ...prev, start: date }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Date de fin *</Label>
                <DatePickerDemo
                  value={newHoliday.end}
                  onChange={(date) => setNewHoliday((prev) => ({ ...prev, end: date }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleAdd}>Ajouter</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Liste des vacances */}
      {holidays.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Plane className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">Aucune période de vacances</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Ajoutez vos premières vacances pour gérer le planning
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Créer une période
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {holidays.map((holiday) => (
            <Card key={holiday.name} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{holiday.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(holiday.start)} → {formatDate(holiday.end)}
                      <span className="text-xs">
                        ({getDuration(holiday.start, holiday.end)})
                      </span>
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteHoliday(holiday.name)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!deleteHoliday} onOpenChange={() => setDeleteHoliday(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la période <strong>{deleteHoliday}</strong> ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteHoliday && handleDelete(deleteHoliday)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
