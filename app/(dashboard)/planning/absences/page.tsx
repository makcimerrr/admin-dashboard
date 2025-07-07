'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
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
import { format, parseISO, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Loader2,
  Trash2,
  Edit,
  Plus,
  Calendar,
  Users,
  LayoutTemplate,
  Clock
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
import Link from 'next/link';
import { toast as sonnerToast } from 'sonner';
import { useSession } from 'next-auth/react';

const slotTypeConfig = {
  vacation: { label: 'Congés' },
  sick: { label: 'Arrêt maladie' },
  personal: { label: 'Personnel' }
};

// Types
interface Absence {
  slotId: string;
  employeeId: string;
  weekKey: string;
  day: string;
  start: string;
  end: string;
  type: string;
  note?: string;
  employee?: { id: string; name: string };
}
interface Employee {
  id: string;
  name: string;
}

function isValidDateString(dateStr: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(new Date(dateStr).getTime())
  );
}

// Ajoute la fonction utilitaire pour convertir weekKey + day en date
function getDateFromWeekKeyAndDay(weekKey: string, day: string): string | null {
  const [yearStr, weekStr] = weekKey.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);
  const daysOfWeek = [
    'lundi',
    'mardi',
    'mercredi',
    'jeudi',
    'vendredi',
    'samedi',
    'dimanche'
  ];
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

// Regroupe les absences consécutives par employé et type
function groupAbsences(absences: Absence[] & { date?: string }[]) {
  // Trie par employé, type, puis date
  const sorted = [...absences].sort((a, b) => {
    if (a.employeeId !== b.employeeId)
      return a.employeeId.localeCompare(b.employeeId);
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
    return <Badge variant="destructive">Date invalide</Badge>;
  }
  const date = new Date(dateStr);
  const days = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
      <span className="font-semibold">{days[date.getDay()]}</span>{' '}
      {format(date, 'dd/MM/yyyy')}
    </span>
  );
}

function countDays(start: string, end: string) {
  const d1 = new Date(start);
  const d2 = new Date(end);
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function countWeeks(start: string, end: string) {
  return Math.ceil(countDays(start, end) / 7);
}

export default function AbsencesPage() {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filters, setFilters] = useState<{
    employeeId: string;
    type: string;
    start: string | null;
    end: string | null;
    search: string;
  }>({
    employeeId: 'all',
    type: 'all',
    start: null,
    end: null,
    search: ''
  });
  const { toast } = useToast();
  const { data: session } = useSession();
  const planningPermission = session?.user?.planningPermission || 'reader';

  // Ajout d'absence
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
        // Prépare la query string selon les filtres
        const params = new URLSearchParams();
        if (filters.employeeId && filters.employeeId !== 'all')
          params.append('employeeId', filters.employeeId);
        if (filters.type && filters.type !== 'all')
          params.append('type', filters.type);
        if (filters.start) params.append('start', filters.start);
        if (filters.end) params.append('end', filters.end);
        const [absencesRes, employeesRes] = await Promise.all([
          fetch(`/api/schedules/absences?${params.toString()}`),
          fetch('/api/employees')
        ]);
        const absencesData = await absencesRes.json();
        const employeesData = await employeesRes.json();
        // Associe l'employé à chaque absence et ajoute la date réelle
        const abs = absencesData.map((a: Absence) => {
          const date = getDateFromWeekKeyAndDay(a.weekKey, a.day);
          return {
            ...a,
            date,
            employee: employeesData.find((e: Employee) => e.id === a.employeeId)
          };
        });
        setAbsences(abs);
        setEmployees(employeesData);
      } catch (e) {
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les absences',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast, filters]);

  // Filtres (uniquement sur le nom employé côté front)
  const filteredAbsences = useMemo(() => {
    return absences.filter((a) => {
      if (
        filters.search &&
        !a.employee?.name?.toLowerCase().includes(filters.search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [absences, filters]);

  // Groupe les absences consécutives
  const grouped = useMemo(
    () => groupAbsences(filteredAbsences),
    [filteredAbsences]
  );

  // Edition
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
      // Supprime tous les anciens slots
      for (const slotId of editGroup.slotIds) {
        const absence = absences.find((a) => a.slotId === slotId);
        if (!absence) continue;
        const res = await fetch(
          `/api/schedules?employeeId=${absence.employeeId}&weekKey=${absence.weekKey}&day=${absence.day}`
        );
        const sched = await res.json();
        if (!sched || !sched[0]) continue;
        const newSlots = sched[0].timeSlots.filter(
          (s: { id: string }) => s.id !== slotId
        );
        await fetch(`/api/schedules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: absence.employeeId,
            weekKey: absence.weekKey,
            day: absence.day,
            timeSlots: newSlots
          })
        });
      }
      // Ajoute les nouveaux slots pour chaque jour de la nouvelle période
      let d = new Date(editStart);
      const end = new Date(editEnd);
      while (d <= end) {
        const dateStr = d.toISOString().slice(0, 10);
        // Trouver weekKey et day
        const weekKey = `${d.getFullYear()}-W${getWeekNumber(d)}`;
        const daysOfWeek = [
          'lundi',
          'mardi',
          'mercredi',
          'jeudi',
          'vendredi',
          'samedi',
          'dimanche'
        ];
        const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
        const day = daysOfWeek[dayIdx];
        // Ne pas créer de slot pour les congés sur samedi/dimanche
        if (editType === 'vacation' && (day === 'samedi' || day === 'dimanche')) {
          d = addDays(d, 1);
          continue;
        }
        await fetch(`/api/schedules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: editGroup.employeeId,
            weekKey,
            day,
            timeSlots: [
              {
                start: dateStr,
                end: dateStr,
                isWorking: false,
                type: editType,
                note: editNote
              }
            ]
          })
        });
        d = addDays(d, 1);
      }
      toast({ title: 'Succès', description: 'Absence modifiée' });
      closeEdit();
      window.location.reload();
    } catch (e) {
      toast({
        title: 'Erreur',
        description: 'Modification échouée',
        variant: 'destructive'
      });
    } finally {
      setEditLoading(false);
    }
  };

  // Suppression d'un groupe
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
                const res = await fetch(
                  `/api/schedules?employeeId=${absence.employeeId}&weekKey=${absence.weekKey}&day=${absence.day}`
                );
                const sched = await res.json();
                if (!sched || !sched[0]) return;
                const newSlots = sched[0].timeSlots.filter(
                  (s: { id: string }) => s.id !== slotId
                );
                await fetch(`/api/schedules`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    employeeId: absence.employeeId,
                    weekKey: absence.weekKey,
                    day: absence.day,
                    timeSlots: newSlots
                  })
                });
              })
            );
            toast({ title: 'Succès', description: 'Absence supprimée' });
            window.location.reload();
          } catch (e) {
            toast({
              title: 'Erreur',
              description: 'Suppression échouée',
              variant: 'destructive'
            });
          } finally {
            setEditLoading(false);
          }
        }
      },
      cancel: 'Annuler'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header harmonisé */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8 text-blue-600" />
            Gestion des Absences
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Ajoutez et gérez les absences de votre équipe</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/planning">
            <Button variant="outline">
              <LayoutTemplate className="h-4 w-4 mr-2" />
              Planning
            </Button>
          </Link>
          <Link href="/planning/absences">
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Absences
            </Button>
          </Link>
          <Link href="/planning/extraction">
            <Button variant="outline">
              <LayoutTemplate className="h-4 w-4 mr-2" />
              Extraction
            </Button>
          </Link>
          <Link href="/employees">
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Employés
            </Button>
          </Link>
          {planningPermission === 'editor' && (
            <Link href="/history">
              <Button variant="outline">
                <Clock className="h-4 w-4 mr-2" />
                History
              </Button>
            </Link>
          )}
        </div>
      </div>
      <div className="mb-2 flex items-center gap-2">
        <span className="font-semibold">Droits planning :</span>
        <span className={`px-2 py-1 rounded text-xs font-bold ${planningPermission === 'editor' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{planningPermission === 'editor' ? 'EDITOR' : 'READER'}</span>
      </div>
      {/* Contenu principal dans un conteneur harmonisé */}
      <div className="rounded-lg border bg-background p-6">
        <div className="mb-4 flex justify-between items-center">
          <div className="flex gap-2">
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="default"
                  onClick={() => setAddDialogOpen(true)}
                  disabled={planningPermission !== 'editor'}
                  title={planningPermission !== 'editor' ? 'Accès en lecture seule' : undefined}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une absence
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter une absence</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block mb-1 text-sm font-medium">
                      Employé
                    </label>
                    <Select
                      value={addEmployeeId}
                      onValueChange={setAddEmployeeId}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Choisir..." />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium">
                      Type
                    </label>
                    <Select value={addType} onValueChange={setAddType}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(slotTypeConfig).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <div>
                      <label className="block mb-1 text-sm font-medium">
                        Début
                      </label>
                      <DatePickerDemo
                        value={addStart}
                        onChange={setAddStart}
                        className="w-36"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 text-sm font-medium">
                        Fin
                      </label>
                      <DatePickerDemo
                        value={addEnd}
                        onChange={setAddEnd}
                        className="w-36"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium">
                      Note
                    </label>
                    <Input
                      value={addNote}
                      onChange={(e) => setAddNote(e.target.value)}
                      placeholder="Optionnel"
                    />
                  </div>
                  <div className="flex gap-2 justify-end mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setAddDialogOpen(false)}
                    >
                      Annuler
                    </Button>
                    <Button
                      variant="default"
                      disabled={
                        addLoading ||
                        !addEmployeeId ||
                        !addType ||
                        !addStart ||
                        !addEnd
                      }
                      onClick={async () => {
                        if (!addEmployeeId || !addType || !addStart || !addEnd)
                          return;
                        setAddLoading(true);
                        try {
                          // Ajout custom : ne crée pas de slot pour les samedis/dimanches si type vacation
                          let d = new Date(addStart);
                          const end = new Date(addEnd);
                          let allOk = true;
                          while (d <= end) {
                            const dateStr = d.toISOString().slice(0, 10);
                            const weekKey = `${d.getFullYear()}-W${getWeekNumber(d)}`;
                            const daysOfWeek = [
                              'lundi',
                              'mardi',
                              'mercredi',
                              'jeudi',
                              'vendredi',
                              'samedi',
                              'dimanche'
                            ];
                            const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
                            const day = daysOfWeek[dayIdx];
                            if (addType === 'vacation' && (day === 'samedi' || day === 'dimanche')) {
                              d = addDays(d, 1);
                              continue;
                            }
                            const res = await fetch('/api/schedules', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                employeeId: addEmployeeId,
                                weekKey,
                                day,
                                timeSlots: [
                                  {
                                    start: dateStr,
                                    end: dateStr,
                                    isWorking: false,
                                    type: addType,
                                    note: addNote
                                  }
                                ]
                              })
                            });
                            if (!res.ok) allOk = false;
                            d = addDays(d, 1);
                          }
                          if (allOk) {
                            toast({
                              title: 'Succès',
                              description: 'Absence ajoutée'
                            });
                            setAddDialogOpen(false);
                            setAddEmployeeId('');
                            setAddType('vacation');
                            setAddStart(undefined);
                            setAddEnd(undefined);
                            setAddNote('');
                            // Rafraîchir la liste
                            const params = new URLSearchParams();
                            if (
                              filters.employeeId &&
                              filters.employeeId !== 'all'
                            )
                              params.append('employeeId', filters.employeeId);
                            if (filters.type && filters.type !== 'all')
                              params.append('type', filters.type);
                            if (filters.start)
                              params.append('start', filters.start);
                            if (filters.end) params.append('end', filters.end);
                            const absencesRes = await fetch(
                              `/api/schedules/absences?${params.toString()}`
                            );
                            const absencesData = await absencesRes.json();
                            setAbsences(
                              absencesData.map((a: Absence) => ({
                                ...a,
                                date: getDateFromWeekKeyAndDay(
                                  a.weekKey,
                                  a.day
                                ),
                                employee: employees.find(
                                  (e: Employee) => e.id === a.employeeId
                                )
                              }))
                            );
                          } else {
                            toast({
                              title: 'Erreur',
                              description: "Impossible d'ajouter l'absence",
                              variant: 'destructive'
                            });
                          }
                        } catch (e) {
                          toast({
                            title: 'Erreur',
                            description: "Impossible d'ajouter l'absence",
                            variant: 'destructive'
                          });
                        } finally {
                          setAddLoading(false);
                        }
                      }}
                    >
                      {addLoading ? (
                        <Loader2 className="animate-spin w-4 h-4" />
                      ) : (
                        'Ajouter'
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-6">Gestion des absences</h1>
        <div className="flex flex-wrap gap-4 mb-6 items-end">
          <div>
            <label className="block mb-1 text-sm font-medium">Employé</label>
            <Select
              value={filters.employeeId}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, employeeId: v }))
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">Type</label>
            <Select
              value={filters.type}
              onValueChange={(v) => setFilters((f) => ({ ...f, type: v }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {Object.entries(slotTypeConfig).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">
              Début après
            </label>
            <DatePickerDemo
              value={filters.start || undefined}
              onChange={(dateStr) =>
                setFilters((f) => ({ ...f, start: dateStr || null }))
              }
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">Fin avant</label>
            <DatePickerDemo
              value={filters.end || undefined}
              onChange={(dateStr) =>
                setFilters((f) => ({ ...f, end: dateStr || null }))
              }
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">Recherche</label>
            <Input
              placeholder="Nom employé..."
              value={filters.search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFilters((f) => ({ ...f, search: e.target.value }))
              }
              className="w-56"
            />
          </div>
        </div>
        <div className="rounded-lg border bg-background overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="animate-spin w-8 h-8" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employé</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Du</TableHead>
                  <TableHead>Au</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped.map((group) => {
                  const daysCount = countDays(group.start, group.end);
                  const weeksCount = countWeeks(group.start, group.end);
                  return (
                    <TableRow key={group.slotIds.join('-') + group.employeeId}>
                      <TableCell>
                        {group.employee?.name || group.employeeId}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="capitalize flex items-center gap-2"
                        >
                          <span
                            className={`inline-block w-2 h-2 rounded-full ${group.type === 'vacation' ? 'bg-orange-400' : group.type === 'sick' ? 'bg-red-400' : 'bg-purple-400'}`}
                          />
                          {slotTypeConfig[
                            group.type as keyof typeof slotTypeConfig
                          ]?.label || group.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDateLabel(group.start)}</TableCell>
                      <TableCell>{formatDateLabel(group.end)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="mr-2">
                          {daysCount} jour{daysCount > 1 ? 's' : ''}
                        </Badge>
                        {daysCount > 6 && (
                          <Badge variant="outline">
                            {weeksCount} semaine{weeksCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {group.notes.join('; ')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            title="Éditer"
                            onClick={() => openEdit(group)}
                            disabled={planningPermission !== 'editor'}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Dialog
                            open={editDialogOpen}
                            onOpenChange={(open) => {
                              if (!open) closeEdit();
                            }}
                          >
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Modifier l'absence</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="secondary">
                                    {editGroup?.employee?.name ||
                                      editGroup?.employeeId}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className="capitalize flex items-center gap-2"
                                  >
                                    <span
                                      className={`inline-block w-2 h-2 rounded-full ${editGroup?.type === 'vacation' ? 'bg-orange-400' : editGroup?.type === 'sick' ? 'bg-red-400' : 'bg-purple-400'}`}
                                    />
                                    {slotTypeConfig[
                                      editGroup?.type as keyof typeof slotTypeConfig
                                    ]?.label || editGroup?.type}
                                  </Badge>
                                </div>
                                <Tabs
                                  value={editMode}
                                  onValueChange={(v) =>
                                    setEditMode(v as 'type' | 'periode')
                                  }
                                  className="w-full"
                                >
                                  <TabsList className="mb-4">
                                    <TabsTrigger value="type">
                                      Modifier le type
                                    </TabsTrigger>
                                    <TabsTrigger value="periode">
                                      Modifier la période
                                    </TabsTrigger>
                                  </TabsList>
                                  <TabsContent value="type">
                                    <div className="flex gap-2 items-center mb-2">
                                      <div>
                                        <label className="block mb-1 text-sm font-medium">
                                          Début
                                        </label>
                                        <Badge variant="outline">
                                          {formatDateLabel(editStart)}
                                        </Badge>
                                      </div>
                                      <div>
                                        <label className="block mb-1 text-sm font-medium">
                                          Fin
                                        </label>
                                        <Badge variant="outline">
                                          {formatDateLabel(editEnd)}
                                        </Badge>
                                      </div>
                                      <div className="flex flex-col justify-center items-start mt-5">
                                        <Badge variant="secondary">
                                          {countDays(editStart, editEnd)} jour
                                          {countDays(editStart, editEnd) > 1
                                            ? 's'
                                            : ''}
                                        </Badge>
                                        {countDays(editStart, editEnd) > 6 && (
                                          <Badge variant="outline">
                                            {countWeeks(editStart, editEnd)}{' '}
                                            semaine
                                            {countWeeks(editStart, editEnd) > 1
                                              ? 's'
                                              : ''}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <label className="block mb-1 text-sm font-medium">
                                        Type
                                      </label>
                                      <Select
                                        value={editType}
                                        onValueChange={setEditType}
                                        disabled={editMode !== 'type'}
                                      >
                                        <SelectTrigger className="w-40">
                                          <SelectValue placeholder="Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {Object.entries(slotTypeConfig).map(
                                            ([k, v]) => (
                                              <SelectItem
                                                key={k}
                                                value={k}
                                                className="flex items-center gap-2"
                                              >
                                                <span
                                                  className={`inline-block w-2 h-2 rounded-full ${k === 'vacation' ? 'bg-orange-400' : k === 'sick' ? 'bg-red-400' : 'bg-purple-400'}`}
                                                />
                                                {v.label}
                                              </SelectItem>
                                            )
                                          )}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </TabsContent>
                                  <TabsContent value="periode">
                                    <div className="flex gap-2 items-center mb-2">
                                      <div>
                                        <label className="block mb-1 text-sm font-medium">
                                          Début
                                        </label>
                                        {editMode === 'periode' ? (
                                          <DatePickerDemo
                                            value={editStart}
                                            onChange={setEditStart}
                                            className="w-36"
                                          />
                                        ) : (
                                          <Badge variant="outline">
                                            {formatDateLabel(editStart)}
                                          </Badge>
                                        )}
                                      </div>
                                      <div>
                                        <label className="block mb-1 text-sm font-medium">
                                          Fin
                                        </label>
                                        {editMode === 'periode' ? (
                                          <DatePickerDemo
                                            value={editEnd}
                                            onChange={setEditEnd}
                                            className="w-36"
                                          />
                                        ) : (
                                          <Badge variant="outline">
                                            {formatDateLabel(editEnd)}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex flex-row gap-2 items-center justify-center mb-2">
                                      <Badge
                                        variant="secondary"
                                        className="text-xs py-1 px-2"
                                      >
                                        {countDays(editStart, editEnd)} jour
                                        {countDays(editStart, editEnd) > 1
                                          ? 's'
                                          : ''}
                                      </Badge>
                                      {countDays(editStart, editEnd) > 6 && (
                                        <Badge
                                          variant="outline"
                                          className="text-xs py-1 px-2"
                                        >
                                          {countWeeks(editStart, editEnd)}{' '}
                                          semaine
                                          {countWeeks(editStart, editEnd) > 1
                                            ? 's'
                                            : ''}
                                        </Badge>
                                      )}
                                    </div>
                                    <div>
                                      <label className="block mb-1 text-sm font-medium">
                                        Type
                                      </label>
                                      <Badge
                                        variant="outline"
                                        className="capitalize flex items-center gap-2"
                                      >
                                        <span
                                          className={`inline-block w-2 h-2 rounded-full ${editType === 'vacation' ? 'bg-orange-400' : editType === 'sick' ? 'bg-red-400' : 'bg-purple-400'}`}
                                        />
                                        {slotTypeConfig[
                                          editType as keyof typeof slotTypeConfig
                                        ]?.label || editType}
                                      </Badge>
                                    </div>
                                  </TabsContent>
                                </Tabs>
                                <div>
                                  <label className="block mb-1 text-sm font-medium">
                                    Note
                                  </label>
                                  <Input
                                    value={editNote}
                                    onChange={(e) =>
                                      setEditNote(e.target.value)
                                    }
                                  />
                                </div>
                                <div className="flex gap-2 justify-end mt-4">
                                  <Button variant="outline" onClick={closeEdit}>
                                    Annuler
                                  </Button>
                                  <Button
                                    variant="default"
                                    disabled={editLoading || !editMode}
                                    onClick={handleEdit}
                                  >
                                    Enregistrer
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button
                            size="icon"
                            variant="destructive"
                            title="Supprimer"
                            onClick={() => handleDeleteGroup(group)}
                            disabled={planningPermission !== 'editor'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {grouped.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground"
                    >
                      Aucune absence trouvée
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
