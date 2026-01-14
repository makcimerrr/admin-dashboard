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
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Trash2, Edit, GraduationCap } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { DatePickerDemo } from '@/components/date-picker';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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

export default function PromoManagement() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deletePromo, setDeletePromo] = useState<string | null>(null);
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

  useEffect(() => {
    fetchPromos();
  }, []);

  const fetchPromos = async () => {
    try {
      const response = await fetch('/api/promos');
      if (!response.ok) throw new Error('Unable to fetch promotions');
      const data = await response.json();
      setPromos(data.promos);
    } catch (error) {
      console.error('Error fetching promotions:', error);
      toast.error('Impossible de récupérer les promotions.');
    }
  };

  const handleAdd = async () => {
    if (!newPromo.key || !newPromo.eventId || !newPromo.title || !newPromo.dates.start || !newPromo.dates.end) {
      toast.error('Veuillez remplir tous les champs obligatoires.');
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
      await fetchPromos();
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
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Erreur lors de l\'ajout :', error);
      toast.error('Impossible d\'ajouter la promotion.');
    }
  };

  const handleDelete = async (key: string) => {
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

      toast.success('Promotion supprimée avec succès.');
      await fetchPromos();
      setDeletePromo(null);
    } catch (error) {
      console.error('Erreur lors de la suppression :', error);
      toast.error('Impossible de supprimer la promotion.');
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

  return (
    <div className="space-y-6">
      {/* Header avec bouton d\'ajout */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Promotions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {promos.length} promotion{promos.length > 1 ? 's' : ''} configurée{promos.length > 1 ? 's' : ''}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle promotion
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ajouter une promotion</DialogTitle>
              <DialogDescription>
                Créez une nouvelle promotion avec ses dates de début et de fin
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="key">Clé de la promotion *</Label>
                  <Input
                    id="key"
                    placeholder="ex: P1 2025"
                    value={newPromo.key}
                    onChange={(e) => setNewPromo((prev) => ({ ...prev, key: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eventId">ID de l'événement *</Label>
                  <Input
                    id="eventId"
                    type="number"
                    placeholder="ex: 303"
                    value={newPromo.eventId || ''}
                    onChange={(e) => setNewPromo((prev) => ({ ...prev, eventId: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Titre *</Label>
                <Input
                  id="title"
                  placeholder="ex: Promotion 1 - 2025"
                  value={newPromo.title}
                  onChange={(e) => setNewPromo((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-4">Dates de la promotion</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date de début *</Label>
                    <DatePickerDemo
                      value={newPromo.dates.start}
                      onChange={(date) => setNewPromo((prev) => ({
                        ...prev,
                        dates: { ...prev.dates, start: date }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date de fin *</Label>
                    <DatePickerDemo
                      value={newPromo.dates.end}
                      onChange={(date) => setNewPromo((prev) => ({
                        ...prev,
                        dates: { ...prev.dates, end: date }
                      }))}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-4">Piscine JavaScript (optionnel)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Début Piscine JS</Label>
                    <DatePickerDemo
                      value={newPromo.dates['piscine-js-start']}
                      onChange={(date) => setNewPromo((prev) => ({
                        ...prev,
                        dates: { ...prev.dates, 'piscine-js-start': date }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fin Piscine JS</Label>
                    <DatePickerDemo
                      value={newPromo.dates['piscine-js-end']}
                      onChange={(date) => setNewPromo((prev) => ({
                        ...prev,
                        dates: { ...prev.dates, 'piscine-js-end': date }
                      }))}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-4">Piscine Rust/Java (optionnel)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Début Piscine Rust/Java</Label>
                    <DatePickerDemo
                      value={newPromo.dates['piscine-rust-java-start']}
                      onChange={(date) => setNewPromo((prev) => ({
                        ...prev,
                        dates: { ...prev.dates, 'piscine-rust-java-start': date }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fin Piscine Rust/Java</Label>
                    <DatePickerDemo
                      value={newPromo.dates['piscine-rust-java-end']}
                      onChange={(date) => setNewPromo((prev) => ({
                        ...prev,
                        dates: { ...prev.dates, 'piscine-rust-java-end': date }
                      }))}
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleAdd}>Ajouter la promotion</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Liste des promotions */}
      {promos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">Aucune promotion</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Commencez par créer votre première promotion
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Créer une promotion
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {promos.map((promo) => (
            <Card key={promo.key} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl">{promo.key}</CardTitle>
                      <Badge variant="outline" className="font-mono">
                        ID: {promo.eventId}
                      </Badge>
                    </div>
                    <CardDescription>{promo.title}</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletePromo(promo.key)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Période principale:</span>
                    <span className="text-muted-foreground">
                      {formatDate(promo.dates.start)} → {formatDate(promo.dates.end)}
                    </span>
                  </div>

                  {(promo.dates['piscine-js-start'] || promo.dates['piscine-js-end']) && (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="secondary" className="text-xs">JS</Badge>
                      <span className="text-muted-foreground">
                        {formatDate(promo.dates['piscine-js-start'])} → {formatDate(promo.dates['piscine-js-end'])}
                      </span>
                    </div>
                  )}

                  {(promo.dates['piscine-rust-java-start'] || promo.dates['piscine-rust-java-end']) && (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="secondary" className="text-xs">Rust/Java</Badge>
                      <span className="text-muted-foreground">
                        {formatDate(promo.dates['piscine-rust-java-start'])} → {formatDate(promo.dates['piscine-rust-java-end'])}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!deletePromo} onOpenChange={() => setDeletePromo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la promotion <strong>{deletePromo}</strong> ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePromo && handleDelete(deletePromo)}
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
