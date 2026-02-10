'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { DatePickerDemo } from '@/components/date-picker';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/hooks/use-toast';
import { addDays } from 'date-fns';
import {
  Loader2,
  Trash2,
  Edit,
  Plus,
  Calendar,
  RotateCcw
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { getWeekNumber } from '@/lib/db/utils';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast as sonnerToast } from 'sonner';
import { useUser } from "@stackframe/stack";
import { PlanningPageHeader } from '@/components/planning/planning-page-header';
import { FilterToolbar } from '@/components/planning/filter-toolbar';
import { EmployeeColorDot } from '@/components/planning/employee-color-dot';

const slotTypeConfig = {
  vacation: { label: 'Congés', color: 'orange' },
  sick: { label: 'Arrêt maladie', color: 'red' },
  personal: { label: 'Personnel', color: 'purple' }
};

interface Absence {
  slotId: string;
  employeeId: string;
  weekKey: string;
  day: string;
  start: string;
  end: string;
  type: string;
  note?: string;
  employee?: Employee;
  date?: string;
}

interface Employee {
  id: string;
  name: string;
  color?: string;
}

function isValidDateString(dateStr: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(new Date(dateStr).getTime());
}

function getDateFromWeekKeyAndDay(weekKey: string, day: string): string | null {
  const [yearStr, weekStr] = weekKey.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);
  const daysOfWeek = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  const dayIndex = daysOfWeek.indexOf(day);
  if (dayIndex === -1) return null;
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const firstMonday = new Date(jan4);
  firstMonday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7));
  const monday = new Date(firstMonday);
  monday.setUTCDate(firstMonday.getUTCDate() + (week - 1) * 7);
  const date = new Date(monday);
  date.setUTCDate(monday.getUTCDate() + dayIndex);
  return date.toISOString().slice(0, 10);
}

function groupAbsences(absences: Absence[]) {
  const sorted = [...absences].sort((a, b) => {
    if (a.employeeId !== b.employeeId) return a.employeeId.localeCompare(b.employeeId);
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return new Date(a.date!).getTime() - new Date(b.date!).getTime();
  });
  const groups: {
    employeeId: string;
    employee?: Employee;
    type: string;
    start: string;
    end: string;
    notes: string[];
    slotIds: string[];
  }[] = [];
  for (const abs of sorted) {
    if (!abs.date || !isValidDateString(abs.date)) continue;
    const last = groups[groups.length - 1];
    if (
      last &&
      last.employeeId === abs.employeeId &&
      last.type === abs.type &&
      isValidDateString(last.end) &&
      addDays(new Date(last.end), 1).toISOString().slice(0, 10) === abs.date
    ) {
      last.end = abs.date;
      if (abs.note) last.notes.push(abs.note);
      last.slotIds.push(abs.slotId);
    } else {
      groups.push({
        employeeId: abs.employeeId,
        employee: abs.employee,
        type: abs.type,
        start: abs.date,
        end: abs.date,
        notes: abs.note ? [abs.note] : [],
        slotIds: [abs.slotId]
      });
    }
  }
  return groups;
}

function formatDateLabel(dateStr: string) {
  if (!dateStr || isNaN(new Date(dateStr).getTime())) {
    return <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">Invalide</Badge>;
  }
  const date = new Date(dateStr);
  const days = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear());
  return (
    <span className="text-xs font-mono">
      <span className="font-semibold">{days[date.getDay()]}</span> {dd}/{mm}/{yy}
    </span>
  );
}

function countDays(start: string, end: string) {
  return Math.floor((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function countWeeks(start: string, end: string) {
  return Math.ceil(countDays(start, end) / 7);
}

function getTypeBadgeClasses(type: string) {
  if (type === 'vacation') return 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 border-orange-200 dark:border-orange-800';
  if (type === 'sick') return 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-800';
  return 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 border-purple-200 dark:border-purple-800';
}

export default function AbsencesPage() {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filters, setFilters] = useState<{
    employeeId: string;
    type: string;
    start: string | null;
    end: string | null;
    search: string;
  }>({ employeeId: 'all', type: 'all', start: null, end: null, search: '' });
  const { toast } = useToast();
  const stackUser = useUser();
  const planningPermission = stackUser
    ? ((stackUser.clientReadOnlyMetadata?.planningPermission ||
       stackUser.clientMetadata?.planningPermission ||
       'reader') as string)
    : 'reader';

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addEmployeeId, setAddEmployeeId] = useState('');
  const [addType, setAddType] = useState('vacation');
  const [addStart, setAddStart] = useState<string | undefined>(undefined);
  const [addEnd, setAddEnd] = useState<string | undefined>(undefined);
  const [addNote, setAddNote] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.employeeId && filters.employeeId !== 'all') params.append('employeeId', filters.employeeId);
        if (filters.type && filters.type !== 'all') params.append('type', filters.type);
        if (filters.start) params.append('start', filters.start);
        if (filters.end) params.append('end', filters.end);
        const [absencesRes, employeesRes] = await Promise.all([
          fetch(`/api/schedules/absences?${params.toString()}`),
          fetch('/api/employees')
        ]);
        const absencesData = await absencesRes.json();
        const employeesData = await employeesRes.json();
        const abs = absencesData.map((a: Absence) => {
          const date = getDateFromWeekKeyAndDay(a.weekKey, a.day);
          return { ...a, date, employee: employeesData.find((e: Employee) => e.id === a.employeeId) };
        });
        setAbsences(abs);
        setEmployees(employeesData);
      } catch (e) {
        toast({ title: 'Erreur', description: 'Impossible de charger les absences', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast, filters]);

  const filteredAbsences = useMemo(() => {
    return absences.filter((a) => {
      if (filters.search && !a.employee?.name?.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });
  }, [absences, filters]);

  const grouped = useMemo(() => groupAbsences(filteredAbsences), [filteredAbsences]);

  // Edit state
  const [editGroup, setEditGroup] = useState<null | (typeof grouped)[0]>(null);
  const [editType, setEditType] = useState<string>('');
  const [editStart, setEditStart] = useState<string>('');
  const [editEnd, setEditEnd] = useState<string>('');
  const [editNote, setEditNote] = useState<string>('');
  const [editLoading, setEditLoading] = useState(false);
  const [editMode, setEditMode] = useState<'type' | 'periode' | ''>('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const openEdit = (group: (typeof grouped)[0]) => {
    setEditGroup(group);
    setEditType(group.type);
    setEditStart(group.start);
    setEditEnd(group.end);
    setEditNote(group.notes.join('; '));
    setEditMode('');
    setEditDialogOpen(true);
  };
  const closeEdit = () => {
    setEditGroup(null);
    setEditType('');
    setEditStart('');
    setEditEnd('');
    setEditNote('');
    setEditMode('');
    setEditDialogOpen(false);
  };

  const handleEdit = async () => {
    if (!editGroup) return;
    setEditLoading(true);
    try {
      for (const slotId of editGroup.slotIds) {
        const absence = absences.find((a) => a.slotId === slotId);
        if (!absence) continue;
        const res = await fetch(`/api/schedules?employeeId=${absence.employeeId}&weekKey=${absence.weekKey}&day=${absence.day}`);
        const sched = await res.json();
        if (!sched || !sched[0]) continue;
        const newSlots = sched[0].timeSlots.filter((s: { id: string }) => s.id !== slotId);
        await fetch(`/api/schedules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId: absence.employeeId, weekKey: absence.weekKey, day: absence.day, timeSlots: newSlots })
        });
      }
      let d = new Date(editStart);
      const end = new Date(editEnd);
      const daysOfWeek = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
      while (d <= end) {
        const dateStr = d.toISOString().slice(0, 10);
        const weekKey = `${d.getFullYear()}-W${getWeekNumber(d)}`;
        const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
        const day = daysOfWeek[dayIdx];
        if (editType === 'vacation' && (day === 'samedi' || day === 'dimanche')) { d = addDays(d, 1); continue; }
        await fetch(`/api/schedules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId: editGroup.employeeId, weekKey, day, timeSlots: [{ start: dateStr, end: dateStr, isWorking: false, type: editType, note: editNote }] })
        });
        d = addDays(d, 1);
      }
      toast({ title: 'Succès', description: 'Absence modifiée' });
      closeEdit();
      window.location.reload();
    } catch (e) {
      toast({ title: 'Erreur', description: 'Modification échouée', variant: 'destructive' });
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteGroup = async (group: (typeof grouped)[0]) => {
    sonnerToast('Supprimer cette absence sur toute la période ?', {
      description: `${group.employee?.name || group.employeeId} du ${group.start} au ${group.end}`,
      action: {
        label: 'Oui, supprimer',
        onClick: async () => {
          setEditLoading(true);
          try {
            await Promise.all(
              group.slotIds.map(async (slotId) => {
                const absence = absences.find((a) => a.slotId === slotId);
                if (!absence) return;
                const res = await fetch(`/api/schedules?employeeId=${absence.employeeId}&weekKey=${absence.weekKey}&day=${absence.day}`);
                const sched = await res.json();
                if (!sched || !sched[0]) return;
                const newSlots = sched[0].timeSlots.filter((s: { id: string }) => s.id !== slotId);
                await fetch(`/api/schedules`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ employeeId: absence.employeeId, weekKey: absence.weekKey, day: absence.day, timeSlots: newSlots })
                });
              })
            );
            toast({ title: 'Succès', description: 'Absence supprimée' });
            window.location.reload();
          } catch (e) {
            toast({ title: 'Erreur', description: 'Suppression échouée', variant: 'destructive' });
          } finally {
            setEditLoading(false);
          }
        }
      },
      cancel: 'Annuler'
    });
  };

  const handleAddAbsence = async () => {
    if (!addEmployeeId || !addType || !addStart || !addEnd) return;
    setAddLoading(true);
    try {
      let d = new Date(addStart);
      const end = new Date(addEnd);
      let allOk = true;
      const daysOfWeek = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
      while (d <= end) {
        const dateStr = d.toISOString().slice(0, 10);
        const weekKey = `${d.getFullYear()}-W${getWeekNumber(d)}`;
        const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
        const day = daysOfWeek[dayIdx];
        if (addType === 'vacation' && (day === 'samedi' || day === 'dimanche')) { d = addDays(d, 1); continue; }
        const res = await fetch('/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId: addEmployeeId, weekKey, day, timeSlots: [{ start: dateStr, end: dateStr, isWorking: false, type: addType, note: addNote }] })
        });
        if (!res.ok) allOk = false;
        d = addDays(d, 1);
      }
      if (allOk) {
        toast({ title: 'Succès', description: 'Absence ajoutée' });
        setAddDialogOpen(false);
        setAddEmployeeId('');
        setAddType('vacation');
        setAddStart(undefined);
        setAddEnd(undefined);
        setAddNote('');
        // Refresh
        const params = new URLSearchParams();
        if (filters.employeeId && filters.employeeId !== 'all') params.append('employeeId', filters.employeeId);
        if (filters.type && filters.type !== 'all') params.append('type', filters.type);
        if (filters.start) params.append('start', filters.start);
        if (filters.end) params.append('end', filters.end);
        const absencesRes = await fetch(`/api/schedules/absences?${params.toString()}`);
        const absencesData = await absencesRes.json();
        setAbsences(absencesData.map((a: Absence) => ({
          ...a,
          date: getDateFromWeekKeyAndDay(a.weekKey, a.day),
          employee: employees.find((e: Employee) => e.id === a.employeeId)
        })));
      } else {
        toast({ title: 'Erreur', description: "Impossible d'ajouter l'absence", variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Erreur', description: "Impossible d'ajouter l'absence", variant: 'destructive' });
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] p-2 md:p-3 gap-2 overflow-hidden">
      <PlanningPageHeader
        title="Absences"
        subtitle="Ajoutez et gérez les absences de votre équipe"
        icon={Calendar}
        permission={planningPermission}
      >
        {grouped.length > 0 && (
          <Badge variant="secondary" className="text-[10px] px-1.5 h-5">
            {grouped.length} absence{grouped.length > 1 ? 's' : ''}
          </Badge>
        )}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="h-7 text-xs gap-1"
              disabled={planningPermission !== 'editor'}
              title={planningPermission !== 'editor' ? 'Accès en lecture seule' : undefined}
            >
              <Plus className="h-3 w-3" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter une absence</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium">Employé</label>
                <Select value={addEmployeeId} onValueChange={setAddEmployeeId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium">Type</label>
                <Select value={addType} onValueChange={setAddType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(slotTypeConfig).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block mb-1 text-sm font-medium">Début</label>
                  <DatePickerDemo value={addStart} onChange={setAddStart} className="w-full" />
                </div>
                <div className="flex-1">
                  <label className="block mb-1 text-sm font-medium">Fin</label>
                  <DatePickerDemo value={addEnd} onChange={setAddEnd} className="w-full" />
                </div>
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium">Note</label>
                <Input value={addNote} onChange={(e) => setAddNote(e.target.value)} placeholder="Optionnel" />
              </div>
              <div className="flex gap-2 justify-end mt-4">
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Annuler</Button>
                <Button disabled={addLoading || !addEmployeeId || !addType || !addStart || !addEnd} onClick={handleAddAbsence}>
                  {addLoading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Ajouter'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </PlanningPageHeader>

      <FilterToolbar>
        <Select value={filters.employeeId} onValueChange={(v) => setFilters((f) => ({ ...f, employeeId: v }))}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Employé" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {employees.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.type} onValueChange={(v) => setFilters((f) => ({ ...f, type: v }))}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {Object.entries(slotTypeConfig).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DatePickerDemo value={filters.start || undefined} onChange={(d) => setFilters((f) => ({ ...f, start: d || null }))} className="h-8 w-[130px]" />
        <span className="text-xs text-muted-foreground">au</span>
        <DatePickerDemo value={filters.end || undefined} onChange={(d) => setFilters((f) => ({ ...f, end: d || null }))} className="h-8 w-[130px]" />
        <Input
          placeholder="Rechercher..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className="h-8 w-[140px] text-xs"
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={() => setFilters({ employeeId: 'all', type: 'all', start: null, end: null, search: '' })}
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </Button>
      </FilterToolbar>

      <div className="flex-1 min-h-0 overflow-auto rounded-lg border bg-background">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
              <tr className="border-b">
                <th className="p-2 text-left text-[11px] uppercase tracking-wider font-medium text-muted-foreground">Employé</th>
                <th className="p-2 text-left text-[11px] uppercase tracking-wider font-medium text-muted-foreground">Type</th>
                <th className="p-2 text-left text-[11px] uppercase tracking-wider font-medium text-muted-foreground">Du</th>
                <th className="p-2 text-left text-[11px] uppercase tracking-wider font-medium text-muted-foreground">Au</th>
                <th className="p-2 text-left text-[11px] uppercase tracking-wider font-medium text-muted-foreground">Durée</th>
                <th className="p-2 text-left text-[11px] uppercase tracking-wider font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {grouped.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Aucune absence trouvée.</td></tr>
              ) : grouped.map((group) => {
                const daysCount = countDays(group.start, group.end);
                const weeksCount = countWeeks(group.start, group.end);
                return (
                  <tr key={group.slotIds.join('-') + group.employeeId} className="border-b hover:bg-muted/30 align-top">
                    <td className="p-2">
                      <div className="flex items-center gap-1.5">
                        <EmployeeColorDot color={group.employee?.color || '#8884d8'} />
                        <span className="font-medium">{group.employee?.name || group.employeeId.slice(0, 8)}</span>
                      </div>
                    </td>
                    <td className="p-2">
                      <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${getTypeBadgeClasses(group.type)}`}>
                        {slotTypeConfig[group.type as keyof typeof slotTypeConfig]?.label || group.type}
                      </Badge>
                    </td>
                    <td className="p-2">{formatDateLabel(group.start)}</td>
                    <td className="p-2">{formatDateLabel(group.end)}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                          {daysCount}j
                        </Badge>
                        {daysCount > 6 && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                            {weeksCount}sem
                          </Badge>
                        )}
                      </div>
                      {group.notes.length > 0 && (
                        <div className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[120px]">
                          {group.notes.join('; ')}
                        </div>
                      )}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          title="Éditer"
                          onClick={() => openEdit(group)}
                          disabled={planningPermission !== 'editor'}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          title="Supprimer"
                          onClick={() => handleDeleteGroup(group)}
                          disabled={planningPermission !== 'editor'}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { if (!open) closeEdit(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'absence</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-[10px]">{editGroup?.employee?.name || editGroup?.employeeId}</Badge>
              <Badge variant="outline" className={`text-[10px] ${getTypeBadgeClasses(editGroup?.type || '')}`}>
                {slotTypeConfig[editGroup?.type as keyof typeof slotTypeConfig]?.label || editGroup?.type}
              </Badge>
            </div>
            <Tabs value={editMode} onValueChange={(v) => setEditMode(v as 'type' | 'periode')} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="type">Modifier le type</TabsTrigger>
                <TabsTrigger value="periode">Modifier la période</TabsTrigger>
              </TabsList>
              <TabsContent value="type">
                <div className="flex gap-2 items-center mb-2">
                  <div>
                    <label className="block mb-1 text-sm font-medium">Début</label>
                    <Badge variant="outline">{formatDateLabel(editStart)}</Badge>
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium">Fin</label>
                    <Badge variant="outline">{formatDateLabel(editEnd)}</Badge>
                  </div>
                  <div className="flex flex-col justify-center items-start mt-5">
                    <Badge variant="secondary" className="text-[10px]">{countDays(editStart, editEnd)} jour{countDays(editStart, editEnd) > 1 ? 's' : ''}</Badge>
                    {countDays(editStart, editEnd) > 6 && (
                      <Badge variant="outline" className="text-[10px] mt-0.5">{countWeeks(editStart, editEnd)} semaine{countWeeks(editStart, editEnd) > 1 ? 's' : ''}</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium">Type</label>
                  <Select value={editType} onValueChange={setEditType} disabled={editMode !== 'type'}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(slotTypeConfig).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
              <TabsContent value="periode">
                <div className="flex gap-2 items-center mb-2">
                  <div>
                    <label className="block mb-1 text-sm font-medium">Début</label>
                    {editMode === 'periode' ? (
                      <DatePickerDemo value={editStart} onChange={setEditStart} className="w-36" />
                    ) : (
                      <Badge variant="outline">{formatDateLabel(editStart)}</Badge>
                    )}
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium">Fin</label>
                    {editMode === 'periode' ? (
                      <DatePickerDemo value={editEnd} onChange={setEditEnd} className="w-36" />
                    ) : (
                      <Badge variant="outline">{formatDateLabel(editEnd)}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 items-center justify-center mb-2">
                  <Badge variant="secondary" className="text-[10px]">{countDays(editStart, editEnd)} jour{countDays(editStart, editEnd) > 1 ? 's' : ''}</Badge>
                  {countDays(editStart, editEnd) > 6 && (
                    <Badge variant="outline" className="text-[10px]">{countWeeks(editStart, editEnd)} semaine{countWeeks(editStart, editEnd) > 1 ? 's' : ''}</Badge>
                  )}
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium">Type</label>
                  <Badge variant="outline" className={`text-[10px] ${getTypeBadgeClasses(editType)}`}>
                    {slotTypeConfig[editType as keyof typeof slotTypeConfig]?.label || editType}
                  </Badge>
                </div>
              </TabsContent>
            </Tabs>
            <div>
              <label className="block mb-1 text-sm font-medium">Note</label>
              <Input value={editNote} onChange={(e) => setEditNote(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={closeEdit}>Annuler</Button>
              <Button disabled={editLoading || !editMode} onClick={handleEdit}>Enregistrer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
