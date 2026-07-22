'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  LayoutTemplate,
  Plus,
  Copy,
  Trash2,
  Loader2,
  Save,
  Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/hooks/use-toast';
import { useUserAccess } from '@/contexts/user-access-context';
import { PageHeader } from '@/components/page-header';
import type { Employee } from '@/lib/db/schema/employees';
import type { RotationSlot, RotationWeek } from '@/lib/db/schema/rotations';

interface RotationDTO {
  id: number;
  name: string;
  description: string | null;
  weeks: RotationWeek[];
}

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

/** Créneaux proposés en un clic dans l'éditeur de cellule. */
const PRESETS: { label: string; start: string; end: string }[] = [
  { label: '09h – 17h', start: '09:00', end: '17:00' },
  { label: '08h – 16h', start: '08:00', end: '16:00' },
  { label: '10h – 18h', start: '10:00', end: '18:00' },
  { label: '13h – 21h', start: '13:00', end: '21:00' },
  { label: '16h – 21h', start: '16:00', end: '21:00' },
];

function slotLabel(slots: RotationSlot[] | undefined): string {
  if (!slots || slots.length === 0) return '—';
  return slots.map((s) => `${s.start.slice(0, 5)}–${s.end.slice(0, 5)}`).join(' + ');
}

/** Éditeur d'une cellule (employé × jour) : presets, horaire libre ou repos. */
function SlotCell({
  slots,
  onChange,
  disabled,
}: {
  slots: RotationSlot[];
  onChange: (slots: RotationSlot[]) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState(slots[0]?.start ?? '09:00');
  const [customEnd, setCustomEnd] = useState(slots[0]?.end ?? '17:00');
  const isOff = slots.length === 0;

  const set = (next: RotationSlot[]) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'w-full px-1.5 py-1.5 rounded-md text-[11px] font-medium transition-colors border',
            isOff
              ? 'text-muted-foreground/60 border-transparent bg-muted/40'
              : 'text-primary border-primary/20 bg-primary/5',
            !disabled && 'hover:border-primary/40 cursor-pointer',
            disabled && 'cursor-default',
          )}
        >
          {slotLabel(slots)}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3 space-y-2" align="center">
        <div className="grid grid-cols-1 gap-1">
          {PRESETS.map((p) => (
            <Button
              key={p.label}
              variant="outline"
              size="sm"
              className="h-7 text-xs justify-start"
              onClick={() => set([{ start: p.start, end: p.end, isWorking: true, type: 'work' }])}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 pt-1 border-t">
          <Input
            type="time"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="h-7 text-xs px-1.5"
          />
          <span className="text-xs text-muted-foreground">→</span>
          <Input
            type="time"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="h-7 text-xs px-1.5"
          />
          <Button
            size="sm"
            className="h-7 text-xs px-2"
            disabled={!customStart || !customEnd || customEnd <= customStart}
            onClick={() => set([{ start: customStart, end: customEnd, isWorking: true, type: 'work' }])}
          >
            OK
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs w-full text-muted-foreground"
          onClick={() => set([])}
        >
          Repos
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export default function RoulementsPage() {
  const { toast } = useToast();
  const access = useUserAccess();
  const isEditor = access?.planningPermission === 'editor';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rotationList, setRotationList] = useState<RotationDTO[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // Copie de travail du roulement sélectionné (weeks éditées localement).
  const [draft, setDraft] = useState<RotationDTO | null>(null);
  const [dirty, setDirty] = useState(false);
  const [weekIndex, setWeekIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, rotRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/rotations'),
      ]);
      if (!empRes.ok || !rotRes.ok) throw new Error('Failed');
      const emps: Employee[] = await empRes.json();
      const rots: RotationDTO[] = await rotRes.json();
      setEmployees(emps);
      setRotationList(rots);
      setSelectedId((prev) => prev ?? rots[0]?.id ?? null);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger les roulements', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // (Re)charger le brouillon quand la sélection change.
  useEffect(() => {
    const rotation = rotationList.find((r) => r.id === selectedId) ?? null;
    setDraft(rotation ? JSON.parse(JSON.stringify(rotation)) : null);
    setDirty(false);
    setWeekIndex(0);
  }, [selectedId, rotationList]);

  const updateCell = (employeeId: string, day: string, slots: RotationSlot[]) => {
    if (!draft) return;
    setDraft((prev) => {
      if (!prev) return prev;
      const weeks = prev.weeks.map((wk, i) => {
        if (i !== weekIndex) return wk;
        const current = wk[employeeId] ?? {};
        return { ...wk, [employeeId]: { ...current, [day]: slots } };
      });
      return { ...prev, weeks };
    });
    setDirty(true);
  };

  const addWeek = () => {
    if (!draft || draft.weeks.length >= 12) return;
    // Nouvelle semaine = copie de la dernière (base de travail raisonnable).
    const last = draft.weeks[draft.weeks.length - 1] ?? {};
    setDraft({ ...draft, weeks: [...draft.weeks, JSON.parse(JSON.stringify(last))] });
    setWeekIndex(draft.weeks.length);
    setDirty(true);
  };

  const removeWeek = (index: number) => {
    if (!draft || draft.weeks.length <= 1) return;
    const weeks = draft.weeks.filter((_, i) => i !== index);
    setDraft({ ...draft, weeks });
    setWeekIndex(Math.min(weekIndex, weeks.length - 1));
    setDirty(true);
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/rotations/${draft.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: draft.name, weeks: draft.weeks }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? 'Échec de la sauvegarde');
      }
      const updated: RotationDTO = await res.json();
      setRotationList((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setDirty(false);
      toast({ title: 'Roulement enregistré' });
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : 'Échec de la sauvegarde', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const createRotation = async (fromDraft: boolean) => {
    const baseName = fromDraft && draft ? `${draft.name} (copie)` : 'Nouveau roulement';
    // Roulement vierge : 1 semaine, tout le monde en repos.
    const emptyWeek: RotationWeek = Object.fromEntries(
      employees.map((e) => [e.id, Object.fromEntries(DAYS.map((d) => [d, []]))]),
    );
    const weeks = fromDraft && draft ? draft.weeks : [emptyWeek];
    try {
      const res = await fetch('/api/rotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: baseName, weeks }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? 'Échec de la création');
      }
      const created: RotationDTO = await res.json();
      setRotationList((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedId(created.id);
      toast({ title: `Roulement « ${created.name} » créé` });
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : 'Échec de la création', variant: 'destructive' });
    }
  };

  const deleteSelected = async () => {
    if (!draft) return;
    try {
      const res = await fetch(`/api/rotations/${draft.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setRotationList((prev) => prev.filter((r) => r.id !== draft.id));
      setSelectedId(null);
      toast({ title: 'Roulement supprimé' });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de supprimer', variant: 'destructive' });
    }
  };

  const renameSelected = async () => {
    if (!draft || !renameValue.trim()) return;
    setDraft({ ...draft, name: renameValue.trim() });
    setDirty(true);
    setRenaming(false);
  };

  return (
    <div className="page-container flex flex-col gap-4 md:gap-6 p-4 md:p-6">
      <PageHeader
        icon={LayoutTemplate}
        title="Roulements"
        description="Cycles de semaines types appliqués au planning — éditables, duplicables"
        badge={
          <Badge
            variant="outline"
            className={isEditor ? 'bg-success/15 text-success border-success/30' : 'bg-warning/15 text-warning border-warning/30'}
          >
            {isEditor ? 'EDITOR' : 'READER'}
          </Badge>
        }
      >
        {isEditor && draft && (
          <Button size="sm" className="h-7 text-xs gap-1" onClick={save} disabled={!dirty || saving}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            {dirty ? 'Enregistrer' : 'Enregistré'}
          </Button>
        )}
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Sélecteur de roulement + actions */}
          <div className="flex flex-wrap items-center gap-2">
            {rotationList.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  if (dirty && !confirm('Modifications non enregistrées — changer de roulement ?')) return;
                  setSelectedId(r.id);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-lg border text-sm transition-all',
                  r.id === selectedId
                    ? 'border-primary/40 bg-primary/10 font-semibold text-primary'
                    : 'border-border text-muted-foreground hover:border-muted-foreground/40',
                )}
              >
                {r.name}
                <span className="ml-1.5 text-[10px] text-muted-foreground">
                  {r.weeks.length} sem.
                </span>
              </button>
            ))}
            {isEditor && (
              <>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => createRotation(false)}>
                  <Plus className="h-3.5 w-3.5" /> Nouveau
                </Button>
                {draft && (
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => createRotation(true)}>
                    <Copy className="h-3.5 w-3.5" /> Dupliquer
                  </Button>
                )}
              </>
            )}
          </div>

          {draft ? (
            <div className="rounded-xl border bg-card overflow-hidden">
              {/* Barre du roulement sélectionné */}
              <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b bg-muted/20">
                {renaming ? (
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="h-7 text-sm w-52"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && renameSelected()}
                    />
                    <Button size="sm" className="h-7 text-xs" onClick={renameSelected}>OK</Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setRenaming(false)}>Annuler</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold">{draft.name}</span>
                    {isEditor && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          setRenameValue(draft.name);
                          setRenaming(true);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
                {draft.description && (
                  <span className="text-xs text-muted-foreground">{draft.description}</span>
                )}
                <div className="flex-1" />
                {isEditor && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive hover:text-destructive">
                        <Trash2 className="h-3 w-3" /> Supprimer
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer « {draft.name} » ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Le roulement sera définitivement supprimé. Les semaines déjà remplies
                          dans le planning ne sont pas modifiées.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={deleteSelected} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>

              {/* Onglets semaines */}
              <div className="flex flex-wrap items-center gap-1.5 px-4 py-2.5 border-b">
                <Label className="text-[11px] font-medium text-muted-foreground mr-1">Cycle :</Label>
                {draft.weeks.map((_, i) => (
                  <div key={i} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setWeekIndex(i)}
                      className={cn(
                        'px-2.5 py-1 rounded-l-md border text-xs transition-all',
                        draft.weeks.length > 1 && isEditor ? 'rounded-r-none border-r-0' : 'rounded-r-md',
                        i === weekIndex
                          ? 'border-primary/40 bg-primary/10 font-semibold text-primary'
                          : 'border-border text-muted-foreground hover:border-muted-foreground/40',
                      )}
                    >
                      Semaine {i + 1}
                    </button>
                    {draft.weeks.length > 1 && isEditor && (
                      <button
                        type="button"
                        title={`Supprimer la semaine ${i + 1}`}
                        onClick={() => removeWeek(i)}
                        className={cn(
                          'px-1 py-1 rounded-r-md border border-l-0 text-xs text-muted-foreground hover:text-destructive transition-colors',
                          i === weekIndex ? 'border-primary/40 bg-primary/10' : 'border-border',
                        )}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {isEditor && draft.weeks.length < 12 && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addWeek}>
                    <Plus className="h-3 w-3" /> Semaine
                  </Button>
                )}
              </div>

              {/* Grille employés × jours */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground min-w-[160px]">Employé</th>
                      {DAYS.map((d) => (
                        <th key={d} className="px-1.5 py-2 text-xs font-medium text-muted-foreground capitalize min-w-[92px]">
                          {d}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => {
                      const empDays = draft.weeks[weekIndex]?.[emp.id] ?? {};
                      return (
                        <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/10">
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: emp.color }} />
                              <span className="text-xs font-medium truncate">{emp.name}</span>
                            </div>
                          </td>
                          {DAYS.map((day) => (
                            <td key={day} className="px-1 py-1.5">
                              <SlotCell
                                slots={empDays[day] ?? []}
                                onChange={(slots) => updateCell(emp.id, day, slots)}
                                disabled={!isEditor}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-8 text-center">
              Aucun roulement sélectionné.
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            Un roulement se répète en cycle sur la plage choisie lors de l&apos;application
            (sidebar du planning). Pour une exception ponctuelle (semaine spéciale, vacances…),
            créez un roulement d&apos;une seule semaine et appliquez-le sur la période concernée.
          </p>
        </div>
      )}
    </div>
  );
}
