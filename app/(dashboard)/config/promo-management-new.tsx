'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '@/lib/client-cache';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingCard } from '@/components/ui/loading-card';
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
import { Calendar, Plus, Trash2, Pencil, GraduationCap, Loader2, AlertCircle, Lock } from 'lucide-react';
import { toast } from 'sonner';
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
  /** Set by GET /api/promos when the row only exists in `promotions`, not in `promoConfig` yet. */
  incomplete?: boolean;
}

const emptyPromo: Promo = {
  key: '',
  eventId: 0,
  title: '',
  dates: {
    start: '',
    'piscine-js-start': '',
    'piscine-js-end': '',
    'piscine-rust-java-start': '',
    'piscine-rust-java-end': '',
    end: '',
  },
};

/** A normalized form value: '' means "not set". The API treats '' / 'NaN' as null. */
function clean(v: string): string {
  return v && v !== 'NaN' ? v : '';
}

/**
 * Client-side mirror of the server validation rules. Returns a list of
 * human-readable messages (empty = valid). Kept in sync with
 * app/api/promos/route.ts `validatePromoDates`.
 */
function validate(p: Promo): string[] {
  const errors: string[] = [];
  const start = clean(p.dates.start);
  const end = clean(p.dates.end);
  const jsStart = clean(p.dates['piscine-js-start']);
  const jsEnd = clean(p.dates['piscine-js-end']);
  const rjStart = clean(p.dates['piscine-rust-java-start']);
  const rjEnd = clean(p.dates['piscine-rust-java-end']);

  if (!p.key.trim()) errors.push('La clé est obligatoire.');
  if (!p.eventId) errors.push("L'ID de l'événement est obligatoire.");
  if (!p.title.trim()) errors.push('Le titre est obligatoire.');
  if (!start || !end) errors.push('Les dates de début et de fin sont obligatoires.');

  if (start && end) {
    if (new Date(start) >= new Date(end)) {
      errors.push('La date de début doit être avant la date de fin.');
    }

    const inRange = (d: string) => new Date(d) >= new Date(start) && new Date(d) <= new Date(end);

    if (jsStart && !inRange(jsStart)) errors.push('Le début de la piscine JS doit être dans la période de la promo.');
    if (jsEnd && !inRange(jsEnd)) errors.push('La fin de la piscine JS doit être dans la période de la promo.');
    if (rjStart && !inRange(rjStart)) errors.push('Le début de la piscine Rust/Java doit être dans la période de la promo.');
    if (rjEnd && !inRange(rjEnd)) errors.push('La fin de la piscine Rust/Java doit être dans la période de la promo.');
  }

  if (jsStart && jsEnd && new Date(jsStart) >= new Date(jsEnd)) {
    errors.push('Le début de la piscine JS doit être avant sa fin.');
  }
  if (rjStart && rjEnd && new Date(rjStart) >= new Date(rjEnd)) {
    errors.push('Le début de la piscine Rust/Java doit être avant sa fin.');
  }
  if (jsEnd && rjStart && new Date(jsEnd) >= new Date(rjStart)) {
    errors.push('La piscine JS doit se terminer avant le début de la piscine Rust/Java.');
  }

  return errors;
}

/**
 * Shared form body for create & edit. `mode` toggles the read-only key field
 * (the key is the PK — changing it is delete+recreate, not an in-place edit).
 * Defined at module scope so it isn't remounted on every parent render (which
 * would steal focus from the inputs while typing).
 */
function PromoForm({
  promo,
  setPromo,
  errors,
  mode,
}: {
  promo: Promo;
  setPromo: (updater: (prev: Promo) => Promo) => void;
  errors: string[];
  mode: 'create' | 'edit';
}) {
  const set = (patch: Partial<Promo['dates']>) =>
    setPromo((prev) => ({ ...prev, dates: { ...prev.dates, ...patch } }));

  return (
    <div className="grid gap-6 py-4">
      {/* Section: identité de la promo */}
      <section className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground">Promotion</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${mode}-key`}>Clé de la promotion *</Label>
            {mode === 'edit' ? (
              <div className="flex items-center gap-2">
                <Input id={`${mode}-key`} value={promo.key} readOnly disabled className="font-mono" />
                <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            ) : (
              <Input
                id={`${mode}-key`}
                placeholder="ex: P1 2025"
                value={promo.key}
                onChange={(e) => setPromo((prev) => ({ ...prev, key: e.target.value }))}
              />
            )}
            {mode === 'edit' && (
              <p className="text-xs text-muted-foreground">
                La clé ne peut pas être modifiée. Pour la changer, supprime puis recrée la promotion.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${mode}-eventId`}>ID de l&apos;événement *</Label>
            <Input
              id={`${mode}-eventId`}
              type="number"
              placeholder="ex: 303"
              value={promo.eventId || ''}
              onChange={(e) => setPromo((prev) => ({ ...prev, eventId: Number(e.target.value) }))}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${mode}-title`}>Titre *</Label>
          <Input
            id={`${mode}-title`}
            placeholder="ex: Promotion 1 - 2025"
            value={promo.title}
            onChange={(e) => setPromo((prev) => ({ ...prev, title: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Date de début *</Label>
            <DatePickerDemo value={promo.dates.start} onChange={(d) => set({ start: d })} />
          </div>
          <div className="space-y-2">
            <Label>Date de fin *</Label>
            <DatePickerDemo value={promo.dates.end} onChange={(d) => set({ end: d })} />
          </div>
        </div>
      </section>

      {/* Section: Piscine JS */}
      <section className="space-y-4 border-t pt-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">JS</Badge>
          <h4 className="text-sm font-semibold text-foreground">Piscine JavaScript</h4>
          <span className="text-xs text-muted-foreground">(optionnel — pilote le planning)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Début Piscine JS</Label>
            <DatePickerDemo
              value={clean(promo.dates['piscine-js-start'])}
              onChange={(d) => set({ 'piscine-js-start': d })}
            />
          </div>
          <div className="space-y-2">
            <Label>Fin Piscine JS</Label>
            <DatePickerDemo
              value={clean(promo.dates['piscine-js-end'])}
              onChange={(d) => set({ 'piscine-js-end': d })}
            />
          </div>
        </div>
      </section>

      {/* Section: Piscine Rust/Java */}
      <section className="space-y-4 border-t pt-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">Rust/Java</Badge>
          <h4 className="text-sm font-semibold text-foreground">Piscine Rust/Java</h4>
          <span className="text-xs text-muted-foreground">(optionnel — pilote le planning)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Début Piscine Rust/Java</Label>
            <DatePickerDemo
              value={clean(promo.dates['piscine-rust-java-start'])}
              onChange={(d) => set({ 'piscine-rust-java-start': d })}
            />
          </div>
          <div className="space-y-2">
            <Label>Fin Piscine Rust/Java</Label>
            <DatePickerDemo
              value={clean(promo.dates['piscine-rust-java-end'])}
              onChange={(d) => set({ 'piscine-rust-java-end': d })}
            />
          </div>
        </div>
      </section>

      {/* Validation inline */}
      {errors.length > 0 && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertCircle className="h-4 w-4" />
            À corriger avant d&apos;enregistrer
          </div>
          <ul className="list-disc pl-6 text-xs text-destructive space-y-0.5">
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function PromoManagement() {
  const { data, isLoading: loading, error: promosError, mutate } = useData<{ promos: Promo[] }>('/api/promos');
  const promos = data?.promos ?? [];
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Create dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPromo, setNewPromo] = useState<Promo>(emptyPromo);

  // Edit dialog state
  const [editPromo, setEditPromo] = useState<Promo | null>(null);

  const [deletePromo, setDeletePromo] = useState<string | null>(null);

  useEffect(() => {
    if (promosError) {
      console.error('Error fetching promotions:', promosError);
      toast.error('Impossible de récupérer les promotions.');
    }
  }, [promosError]);

  const fetchPromos = mutate;

  const createErrors = useMemo(() => validate(newPromo), [newPromo]);
  const editErrors = useMemo(() => (editPromo ? validate(editPromo) : []), [editPromo]);

  const handleAdd = async () => {
    const errors = validate(newPromo);
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    setSaving(true);
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
      setNewPromo(emptyPromo);
      setIsCreateOpen(false);
    } catch (error) {
      console.error("Erreur lors de l'ajout :", error);
      toast.error("Impossible d'ajouter la promotion.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editPromo) return;
    const errors = validate(editPromo);
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/promos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editPromo),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Une erreur est survenue.');
        return;
      }

      toast.success('Promotion mise à jour avec succès.');
      await fetchPromos();
      setEditPromo(null);
    } catch (error) {
      console.error('Erreur lors de la mise à jour :', error);
      toast.error('Impossible de mettre à jour la promotion.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (key: string) => {
    setDeleting(true);
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
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'NaN') return '-';
    try {
      return format(new Date(dateString), 'dd MMM yyyy', { locale: fr });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header avec bouton d'ajout */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Promotions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {promos.length} promotion{promos.length > 1 ? 's' : ''} configurée{promos.length > 1 ? 's' : ''}
          </p>
        </div>
        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) setNewPromo(emptyPromo);
          }}
        >
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
                Créez une nouvelle promotion. Les dates des piscines pilotent le planning.
              </DialogDescription>
            </DialogHeader>
            <PromoForm promo={newPromo} setPromo={setNewPromo} errors={createErrors} mode="create" />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={saving}>
                Annuler
              </Button>
              <Button onClick={handleAdd} disabled={saving || createErrors.length > 0}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ajout...
                  </>
                ) : (
                  'Ajouter la promotion'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Liste des promotions */}
      {loading ? (
        <LoadingCard count={3} columns={3} height="lg" />
      ) : promos.length === 0 ? (
        <Card>
          <CardContent className="py-6">
            <EmptyState
              icon={GraduationCap}
              title="Aucune promotion"
              description="Commencez par créer votre première promotion"
              action={
                <Button onClick={() => setIsCreateOpen(true)} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Créer une promotion
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {promos.map((promo) => (
            <Card key={promo.key} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-xl">{promo.key}</CardTitle>
                      <Badge variant="outline" className="font-mono">
                        ID: {promo.eventId}
                      </Badge>
                      {promo.incomplete && (
                        <Badge
                          variant="outline"
                          className="bg-warning/15 text-warning border-warning/30"
                          title="Existe dans la table promotions mais sans configuration de dates. Ajoute-la via le formulaire pour compléter."
                        >
                          Configuration incomplète
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      {promo.incomplete
                        ? 'Cette promo est enregistrée mais sans dates. Recrée-la via « Nouvelle promotion » avec le même ID et la même clé pour compléter la configuration.'
                        : promo.title}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    {!promo.incomplete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditPromo(promo)}
                        title="Éditer la promotion"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletePromo(promo.key)}
                      className="text-destructive hover:text-destructive"
                      title="Supprimer la promotion"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
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

                  {(clean(promo.dates['piscine-js-start']) || clean(promo.dates['piscine-js-end'])) && (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="secondary" className="text-xs">JS</Badge>
                      <span className="text-muted-foreground">
                        {formatDate(promo.dates['piscine-js-start'])} → {formatDate(promo.dates['piscine-js-end'])}
                      </span>
                    </div>
                  )}

                  {(clean(promo.dates['piscine-rust-java-start']) || clean(promo.dates['piscine-rust-java-end'])) && (
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

      {/* Dialog d'édition */}
      <Dialog
        open={!!editPromo}
        onOpenChange={(open) => {
          if (!open) setEditPromo(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Éditer la promotion</DialogTitle>
            <DialogDescription>
              Modifiez les dates, le titre ou l&apos;ID. Les dates des piscines pilotent le planning.
            </DialogDescription>
          </DialogHeader>
          {editPromo && (
            <PromoForm
              promo={editPromo}
              setPromo={(updater) => setEditPromo((prev) => (prev ? updater(prev) : prev))}
              errors={editErrors}
              mode="edit"
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPromo(null)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleEdit} disabled={saving || editErrors.length > 0}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                'Enregistrer les modifications'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (deletePromo) handleDelete(deletePromo);
              }}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                'Supprimer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
