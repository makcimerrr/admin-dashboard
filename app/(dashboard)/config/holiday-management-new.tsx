'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '@/lib/client-cache';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Plus, Trash2, Pencil, Plane, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { DatePickerDemo } from '@/components/date-picker';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface HolidayRow {
  id: number;
  label: string;
  start: string;
  end: string;
}

interface HolidayForm {
  name: string;
  start: string;
  end: string;
}

interface HolidayGroup {
  label: string;
  periods: HolidayRow[];
}

const emptyForm: HolidayForm = { name: '', start: '', end: '' };

export default function HolidayManagement() {
  const { data: holidaysResponse, isLoading: loading, error: holidaysError, mutate } = useData<{
    success: boolean;
    rows?: HolidayRow[];
  }>('/api/holidays');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Création d'un nouveau label
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<HolidayForm>(emptyForm);

  // Ajout d'une période à un label existant
  const [addToLabel, setAddToLabel] = useState<string | null>(null);
  const [addForm, setAddForm] = useState<{ start: string; end: string }>({ start: '', end: '' });

  // Édition d'une période précise
  const [editRow, setEditRow] = useState<HolidayRow | null>(null);
  const [editForm, setEditForm] = useState<HolidayForm>(emptyForm);

  // Suppression d'une période précise
  const [deleteRow, setDeleteRow] = useState<HolidayRow | null>(null);

  const rows: HolidayRow[] = useMemo(
    () => (holidaysResponse?.success && holidaysResponse.rows ? holidaysResponse.rows : []),
    [holidaysResponse],
  );

  const groups: HolidayGroup[] = useMemo(() => {
    const map = new Map<string, HolidayRow[]>();
    for (const row of rows) {
      const list = map.get(row.label);
      if (list) list.push(row);
      else map.set(row.label, [row]);
    }
    return Array.from(map.entries()).map(([label, periods]) => ({
      label,
      periods: periods.slice().sort((a, b) => a.start.localeCompare(b.start)),
    }));
  }, [rows]);

  const totalPeriods = rows.length;
  const existingLabels = useMemo(() => new Set(groups.map((g) => g.label)), [groups]);

  useEffect(() => {
    if (holidaysError) {
      console.error('Erreur lors de la récupération des vacances :', holidaysError);
      toast.error('Impossible de charger les vacances.');
    }
  }, [holidaysError]);

  // --- Création d'un nouveau label ---
  const handleCreate = async () => {
    const name = createForm.name.trim();
    const { start, end } = createForm;

    if (!name || !start || !end) {
      toast.error('Veuillez remplir tous les champs.');
      return;
    }
    if (existingLabels.has(name)) {
      toast.error('Une période avec ce nom existe déjà. Ajoutez-y plutôt une nouvelle plage.');
      return;
    }
    if (new Date(start) >= new Date(end)) {
      toast.error('La date de fin doit être après la date de début.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, start, end }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Période ajoutée avec succès.');
        await mutate();
        setCreateForm(emptyForm);
        setIsCreateOpen(false);
      } else {
        toast.error(data.message || "Impossible d'ajouter la période.");
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout :", error);
      toast.error("Impossible d'ajouter la période.");
    } finally {
      setSaving(false);
    }
  };

  // --- Ajout d'une plage à un label existant ---
  const openAddToLabel = (label: string) => {
    setAddForm({ start: '', end: '' });
    setAddToLabel(label);
  };

  const handleAddToLabel = async () => {
    if (!addToLabel) return;
    const { start, end } = addForm;

    if (!start || !end) {
      toast.error('Veuillez renseigner les deux dates.');
      return;
    }
    if (new Date(start) >= new Date(end)) {
      toast.error('La date de fin doit être après la date de début.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addToLabel, start, end }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Plage ajoutée avec succès.');
        await mutate();
        setAddToLabel(null);
        setAddForm({ start: '', end: '' });
      } else {
        toast.error(data.message || "Impossible d'ajouter la plage.");
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout :", error);
      toast.error("Impossible d'ajouter la plage.");
    } finally {
      setSaving(false);
    }
  };

  // --- Édition d'une plage ---
  const openEdit = (row: HolidayRow) => {
    setEditForm({ name: row.label, start: row.start, end: row.end });
    setEditRow(row);
  };

  const handleEdit = async () => {
    if (!editRow) return;
    const name = editForm.name.trim();
    const { start, end } = editForm;

    if (!name || !start || !end) {
      toast.error('Veuillez remplir tous les champs.');
      return;
    }
    if (new Date(start) >= new Date(end)) {
      toast.error('La date de fin doit être après la date de début.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/holidays', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editRow.id, name, start, end }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Période modifiée avec succès.');
        await mutate();
        setEditRow(null);
        setEditForm(emptyForm);
      } else {
        toast.error(data.message || 'Impossible de modifier la période.');
      }
    } catch (error) {
      console.error('Erreur lors de la modification :', error);
      toast.error('Impossible de modifier la période.');
    } finally {
      setSaving(false);
    }
  };

  // --- Suppression d'une plage précise (par id) ---
  const handleDelete = async (row: HolidayRow) => {
    setDeleting(true);
    try {
      const response = await fetch('/api/holidays', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Période supprimée avec succès.');
        await mutate();
        setDeleteRow(null);
      } else {
        toast.error(data.message || 'Impossible de supprimer la période.');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression :', error);
      toast.error('Impossible de supprimer la période.');
    } finally {
      setDeleting(false);
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

  const createInvalid =
    !createForm.name.trim() ||
    !createForm.start ||
    !createForm.end ||
    new Date(createForm.start) >= new Date(createForm.end);

  const addInvalid =
    !addForm.start || !addForm.end || new Date(addForm.start) >= new Date(addForm.end);

  const editInvalid =
    !editForm.name.trim() ||
    !editForm.start ||
    !editForm.end ||
    new Date(editForm.start) >= new Date(editForm.end);

  return (
    <div className="space-y-6">
      {/* Header avec bouton de création */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Périodes de vacances</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {groups.length} libellé{groups.length > 1 ? 's' : ''} · {totalPeriods} plage
            {totalPeriods > 1 ? 's' : ''} configurée{totalPeriods > 1 ? 's' : ''}
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
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
                Définissez un nouveau libellé de vacances avec sa première plage de dates.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Nom de la période *</Label>
                <Input
                  id="create-name"
                  placeholder="ex: Vacances d'été 2025"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Date de début *</Label>
                <DatePickerDemo
                  value={createForm.start}
                  onChange={(date) => setCreateForm((prev) => ({ ...prev, start: date }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Date de fin *</Label>
                <DatePickerDemo
                  value={createForm.end}
                  onChange={(date) => setCreateForm((prev) => ({ ...prev, end: date }))}
                />
              </div>
              {createForm.start && createForm.end && new Date(createForm.start) >= new Date(createForm.end) && (
                <p className="text-sm text-destructive">
                  La date de fin doit être après la date de début.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={saving}>
                Annuler
              </Button>
              <Button onClick={handleCreate} disabled={saving || createInvalid}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ajout...
                  </>
                ) : (
                  'Ajouter'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Liste des vacances groupées par libellé */}
      {loading ? (
        <LoadingCard count={3} columns={3} height="md" />
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="py-6">
            <EmptyState
              icon={Plane}
              title="Aucune période de vacances"
              description="Ajoutez vos premières vacances pour gérer le planning"
              action={
                <Button onClick={() => setIsCreateOpen(true)} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Créer une période
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {groups.map((group) => (
            <Card key={group.label} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{group.label}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {group.periods.length} plage{group.periods.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 shrink-0"
                    onClick={() => openAddToLabel(group.label)}
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter une plage
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="divide-y">
                  {group.periods.map((period) => (
                    <li
                      key={period.id}
                      className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-foreground">
                          {formatDate(period.start)} → {formatDate(period.end)}
                        </span>
                        <span className="text-xs">({getDuration(period.start, period.end)})</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(period)}
                          aria-label="Modifier la plage"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteRow(period)}
                          className="text-destructive hover:text-destructive"
                          aria-label="Supprimer la plage"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog: ajouter une plage à un libellé existant */}
      <Dialog open={!!addToLabel} onOpenChange={(open) => !open && setAddToLabel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une plage</DialogTitle>
            <DialogDescription>
              Nouvelle plage de dates pour <strong>{addToLabel}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Date de début *</Label>
              <DatePickerDemo
                value={addForm.start}
                onChange={(date) => setAddForm((prev) => ({ ...prev, start: date }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Date de fin *</Label>
              <DatePickerDemo
                value={addForm.end}
                onChange={(date) => setAddForm((prev) => ({ ...prev, end: date }))}
              />
            </div>
            {addForm.start && addForm.end && new Date(addForm.start) >= new Date(addForm.end) && (
              <p className="text-sm text-destructive">
                La date de fin doit être après la date de début.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddToLabel(null)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleAddToLabel} disabled={saving || addInvalid}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ajout...
                </>
              ) : (
                'Ajouter'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: édition d'une plage */}
      <Dialog open={!!editRow} onOpenChange={(open) => !open && setEditRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la période</DialogTitle>
            <DialogDescription>
              Modifiez le libellé et/ou les dates de cette plage.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nom de la période *</Label>
              <Input
                id="edit-name"
                placeholder="ex: Vacances d'été 2025"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Date de début *</Label>
              <DatePickerDemo
                value={editForm.start}
                onChange={(date) => setEditForm((prev) => ({ ...prev, start: date }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Date de fin *</Label>
              <DatePickerDemo
                value={editForm.end}
                onChange={(date) => setEditForm((prev) => ({ ...prev, end: date }))}
              />
            </div>
            {editForm.start && editForm.end && new Date(editForm.start) >= new Date(editForm.end) && (
              <p className="text-sm text-destructive">
                La date de fin doit être après la date de début.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleEdit} disabled={saving || editInvalid}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                'Enregistrer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression (par id) */}
      <AlertDialog open={!!deleteRow} onOpenChange={(open) => !open && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteRow && (
                <>
                  Êtes-vous sûr de vouloir supprimer la plage{' '}
                  <strong>
                    {formatDate(deleteRow.start)} → {formatDate(deleteRow.end)}
                  </strong>{' '}
                  de <strong>{deleteRow.label}</strong> ? Cette action est irréversible.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (deleteRow) handleDelete(deleteRow);
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
