'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  X,
  LayoutTemplate,
  Copy,
  Calendar as CalendarIcon,
  Palette,
  Loader2,
  ChevronDown,
  ChevronRight,
  Check,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Employee } from '@/lib/db/schema/employees';
import type { TimeSlot } from '@/lib/db/schema/schedules';
import {
  getWeekDates,
  getWeekNumber,
  getWeekKey,
  formatDate,
  EMPLOYEE_COLORS,
} from '@/lib/db/utils';
import { useToast } from '@/components/hooks/use-toast';

// Roulement de 3 semaines hardcodé côté API (basé sur S15→S16→S17)

interface PlanningSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  daysOfWeek: string[];
  currentWeekOffset: number;
  currentWeekKey: string;
  currentWeekDates: Date[];
  updateLocalSchedule: (employeeId: string, day: string, timeSlots: TimeSlot[], weekKey?: string) => Promise<void>;
  reloadSchedules: () => Promise<void>;
  setEmployees: React.Dispatch<React.SetStateAction<any[]>>;
  setSchedules: React.Dispatch<React.SetStateAction<Record<string, TimeSlot[]>>>;
}


function SidebarSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: typeof LayoutTemplate;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
      >
        <div className={cn(
          'p-2 rounded-lg',
          isOpen ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        )}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold flex-1 text-left">{title}</span>
        {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 space-y-3 border-t bg-muted/10">
          <div className="pt-3">{children}</div>
        </div>
      )}
    </div>
  );
}

function EmployeeCheckboxList({
  employees,
  selected,
  onChange,
}: {
  employees: Employee[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const allSelected = selected.length === employees.length;
  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => onChange(allSelected ? [] : employees.map(e => e.id))}
        className="text-[11px] text-primary hover:underline font-medium"
      >
        {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
      </button>
      <div className="grid grid-cols-2 gap-1.5">
        {employees.map((emp) => {
          const checked = selected.includes(emp.id);
          return (
            <button
              key={emp.id}
              type="button"
              onClick={() => {
                if (checked) onChange(selected.filter(id => id !== emp.id));
                else onChange([...selected, emp.id]);
              }}
              className={cn(
                'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all border',
                checked
                  ? 'border-primary/30 bg-primary/5 font-medium'
                  : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted'
              )}
            >
              <div
                className={cn('w-3 h-3 rounded-full border-2 flex items-center justify-center', checked ? 'border-primary' : 'border-muted-foreground/30')}
                style={checked ? { borderColor: emp.color, backgroundColor: emp.color } : {}}
              >
                {checked && <Check className="h-2 w-2 text-white" />}
              </div>
              <span className="truncate">{emp.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PlanningSidebar({
  isOpen,
  onClose,
  employees,
  daysOfWeek,
  currentWeekOffset,
  currentWeekKey,
  currentWeekDates,
  updateLocalSchedule,
  reloadSchedules,
  setEmployees,
  setSchedules,
}: PlanningSidebarProps) {
  const { toast } = useToast();

  // Rotation state
  const [rotationStartDate, setRotationStartDate] = useState<Date | null>(null);
  const [rotationEndDate, setRotationEndDate] = useState<Date | null>(null);
  const [selectedEmployeesForRotation, setSelectedEmployeesForRotation] = useState<string[]>([]);
  const [rotationMode, setRotationMode] = useState<'standard' | 'piscine'>('standard');
  const [rotationLoading, setRotationLoading] = useState(false);

  // Copy state
  const [copyFromWeek, setCopyFromWeek] = useState(currentWeekOffset - 1);
  const [copyToWeek, setCopyToWeek] = useState(currentWeekOffset);
  const [selectedEmployeesForCopy, setSelectedEmployeesForCopy] = useState<string[]>([]);
  const [copyLoading, setCopyLoading] = useState(false);

  // Absence state
  const [absenceEmployeeId, setAbsenceEmployeeId] = useState('');
  const [absenceType, setAbsenceType] = useState<TimeSlot['type']>('vacation');
  const [absenceStartDay, setAbsenceStartDay] = useState(0);
  const [absenceEndDate, setAbsenceEndDate] = useState<Date | null>(null);
  const [absenceLoading, setAbsenceLoading] = useState(false);

  const getWeekOptionsForSelect = () => {
    const options = [];
    for (let i = -4; i <= 4; i++) {
      const weekDates = getWeekDates(i);
      const weekNum = getWeekNumber(weekDates[0]);
      options.push({
        value: i,
        label: `Semaine ${weekNum} (${formatDate(weekDates[0])} - ${formatDate(weekDates[6])})`,
      });
    }
    return options;
  };

  // Rotation apply
  const applyRotation = async () => {
    if (!rotationStartDate || !rotationEndDate) return toast({ title: 'Erreur', description: 'Sélectionnez une date de début et de fin.', variant: 'destructive' });
    if (selectedEmployeesForRotation.length === 0) return toast({ title: 'Erreur', description: 'Sélectionnez au moins un employé.', variant: 'destructive' });
    if (rotationEndDate < rotationStartDate) return toast({ title: 'Erreur', description: 'La date de fin doit être après la date de début.', variant: 'destructive' });

    setRotationLoading(true);
    try {
      const response = await fetch('/api/schedules/apply-rotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: rotationStartDate.toISOString().slice(0, 10),
          endDate: rotationEndDate.toISOString().slice(0, 10),
          employeeIds: selectedEmployeesForRotation,
          mode: rotationMode,
        }),
      });

      if (!response.ok) throw new Error('Failed');
      const data = await response.json();

      await reloadSchedules();
      toast({ title: `Roulement appliqué sur ${data.weeksApplied} semaines` });
      setRotationStartDate(null);
      setRotationEndDate(null);
      setSelectedEmployeesForRotation([]);
      setRotationMode('standard');
    } catch {
      toast({ title: 'Erreur', description: 'Impossible d\'appliquer le roulement', variant: 'destructive' });
    } finally {
      setRotationLoading(false);
    }
  };

  // Copy
  const copySchedules = async () => {
    try {
      setCopyLoading(true);
      const fromWeekKey = getWeekKey(copyFromWeek);
      const toWeekKey = getWeekKey(copyToWeek);
      const employeesToCopy = selectedEmployeesForCopy.length > 0 ? selectedEmployeesForCopy : employees.map((e) => e.id);

      const response = await fetch(`/api/schedules?weekKey=${fromWeekKey}`);
      if (!response.ok) throw new Error('Failed to fetch source schedules');
      const sourceSchedules = await response.json();

      for (const employeeId of employeesToCopy) {
        const employeeSchedules = sourceSchedules.filter((s: any) => s.employeeId === employeeId);
        for (const schedule of employeeSchedules) {
          await fetch('/api/schedules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeId, weekKey: toWeekKey, day: schedule.day, timeSlots: schedule.timeSlots }),
          });
        }
      }

      await reloadSchedules();
      toast({ title: 'Plannings copiés avec succès' });
      setSelectedEmployeesForCopy([]);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de copier les plannings', variant: 'destructive' });
    } finally {
      setCopyLoading(false);
    }
  };

  // Absence
  const applyAbsence = async () => {
    if (!absenceEmployeeId || !absenceEndDate) return toast({ title: 'Erreur', description: 'Remplissez tous les champs.', variant: 'destructive' });

    const startDate = currentWeekDates[absenceStartDay];
    if (absenceEndDate < startDate) {
      return toast({ title: 'Erreur', description: 'La date de fin doit être après la date de début', variant: 'destructive' });
    }

    setAbsenceLoading(true);
    try {
      let current = new Date(startDate);
      current.setHours(0, 0, 0, 0);
      const end = new Date(absenceEndDate);
      end.setHours(0, 0, 0, 0);
      while (current <= end) {
        const weekKey = `${current.getFullYear()}-W${getWeekNumber(current)}`;
        const dayIdx = current.getDay() === 0 ? 6 : current.getDay() - 1;
        const dayName = daysOfWeek[dayIdx];
        await fetch(`/api/schedules?employeeId=${absenceEmployeeId}&weekKey=${weekKey}&day=${dayName}`, { method: 'DELETE' });
        current.setDate(current.getDate() + 1);
      }

      const res = await fetch('/api/schedules/range', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: absenceEmployeeId,
          startDate: startDate.toISOString().slice(0, 10),
          endDate: absenceEndDate.toISOString().slice(0, 10),
          slotType: absenceType,
        }),
      });

      if (res.ok) {
        await reloadSchedules();
        toast({ title: 'Absence ajoutée' });
        setAbsenceEndDate(null);
        setAbsenceEmployeeId('');
      } else {
        toast({ title: 'Erreur', description: "Impossible d'ajouter l'absence", variant: 'destructive' });
      }
    } finally {
      setAbsenceLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />

      {/* Sidebar */}
      <div className="fixed top-0 right-0 h-full w-[420px] max-w-[90vw] bg-background/95 backdrop-blur-xl border-l shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
          <div>
            <h2 className="text-base font-bold">Outils planning</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Templates, copie et absences</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Roulement 3 semaines */}
          <SidebarSection title="Roulement 3 semaines" icon={LayoutTemplate} defaultOpen>
            <div className="space-y-3">
              {/* Mode selector */}
              <div>
                <Label className="text-[11px] font-medium text-muted-foreground">Template</Label>
                <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setRotationMode('standard')}
                    className={cn(
                      'flex flex-col items-center gap-0.5 p-2.5 rounded-lg border text-xs transition-all',
                      rotationMode === 'standard'
                        ? 'border-primary/30 bg-primary/5 font-semibold'
                        : 'border-border hover:border-muted-foreground/30 text-muted-foreground'
                    )}
                  >
                    <span className="text-sm">Standard</span>
                    <span className="text-[10px] text-muted-foreground">09h-17h</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRotationMode('piscine')}
                    className={cn(
                      'flex flex-col items-center gap-0.5 p-2.5 rounded-lg border text-xs transition-all',
                      rotationMode === 'piscine'
                        ? 'border-cyan-500/30 bg-cyan-500/5 font-semibold text-cyan-700'
                        : 'border-border hover:border-muted-foreground/30 text-muted-foreground'
                    )}
                  >
                    <span className="text-sm">Piscine</span>
                    <span className="text-[10px] text-muted-foreground">08h-17h</span>
                  </button>
                </div>
              </div>

              {/* Date pickers */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] font-medium text-muted-foreground">Date de début</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-start text-xs mt-1 h-8">
                        <CalendarIcon className="h-3 w-3 mr-1.5 flex-shrink-0" />
                        <span className="truncate">
                          {rotationStartDate ? format(rotationStartDate, 'dd/MM/yy', { locale: fr }) : 'Choisir...'}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={rotationStartDate || undefined}
                        onSelect={(date) => setRotationStartDate(date || null)}
                        locale={fr}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-[11px] font-medium text-muted-foreground">Date de fin</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-start text-xs mt-1 h-8">
                        <CalendarIcon className="h-3 w-3 mr-1.5 flex-shrink-0" />
                        <span className="truncate">
                          {rotationEndDate ? format(rotationEndDate, 'dd/MM/yy', { locale: fr }) : 'Choisir...'}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={rotationEndDate || undefined}
                        onSelect={(date) => setRotationEndDate(date || null)}
                        locale={fr}
                        disabled={(date) => rotationStartDate ? date < rotationStartDate : false}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground">Employés</Label>
                <div className="mt-1.5">
                  <EmployeeCheckboxList
                    employees={employees}
                    selected={selectedEmployeesForRotation}
                    onChange={setSelectedEmployeesForRotation}
                  />
                </div>
              </div>

              <Button
                size="sm"
                onClick={applyRotation}
                disabled={rotationLoading || !rotationStartDate || !rotationEndDate || selectedEmployeesForRotation.length === 0}
                className="w-full"
              >
                {rotationLoading ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Application en cours...</>
                ) : (
                  <><LayoutTemplate className="h-3.5 w-3.5 mr-1.5" /> Appliquer le roulement</>
                )}
              </Button>
            </div>
          </SidebarSection>

          {/* Copy-paste */}
          <SidebarSection title="Copier un planning" icon={Copy}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] font-medium text-muted-foreground">Depuis</Label>
                  <Select value={copyFromWeek.toString()} onValueChange={(v) => setCopyFromWeek(parseInt(v))}>
                    <SelectTrigger className="text-xs mt-1 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {getWeekOptionsForSelect().map((opt) => (
                        <SelectItem key={opt.value} value={opt.value.toString()} className="text-xs">{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px] font-medium text-muted-foreground">Vers</Label>
                  <Select value={copyToWeek.toString()} onValueChange={(v) => setCopyToWeek(parseInt(v))}>
                    <SelectTrigger className="text-xs mt-1 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {getWeekOptionsForSelect().map((opt) => (
                        <SelectItem key={opt.value} value={opt.value.toString()} className="text-xs">{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-[11px] font-medium text-muted-foreground">Employés (vide = tous)</Label>
                <div className="mt-1.5">
                  <EmployeeCheckboxList
                    employees={employees}
                    selected={selectedEmployeesForCopy}
                    onChange={setSelectedEmployeesForCopy}
                  />
                </div>
              </div>

              <Button size="sm" onClick={copySchedules} disabled={copyLoading} className="w-full">
                {copyLoading ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Copie en cours...</>
                ) : (
                  <><Copy className="h-3.5 w-3.5 mr-1.5" /> Copier le planning</>
                )}
              </Button>
            </div>
          </SidebarSection>

          {/* Absences */}
          <SidebarSection title="Absence multi-jours" icon={CalendarIcon}>
            <div className="space-y-3">
              <div>
                <Label className="text-[11px] font-medium text-muted-foreground">Employé</Label>
                <Select value={absenceEmployeeId} onValueChange={setAbsenceEmployeeId}>
                  <SelectTrigger className="text-xs mt-1 h-8"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: emp.color }} />
                          {emp.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[11px] font-medium text-muted-foreground">Type d'absence</Label>
                <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                  {([
                    { value: 'vacation', label: 'Congés', emoji: '🏖' },
                    { value: 'sick', label: 'Maladie', emoji: '🏥' },
                    { value: 'personal', label: 'Personnel', emoji: '👤' },
                  ] as const).map(({ value, label, emoji }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAbsenceType(value)}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all',
                        absenceType === value
                          ? 'border-primary bg-primary/5 font-medium'
                          : 'border-border hover:border-muted-foreground/30 text-muted-foreground'
                      )}
                    >
                      <span className="text-base">{emoji}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] font-medium text-muted-foreground">Jour de début</Label>
                  <Select value={absenceStartDay.toString()} onValueChange={(v) => setAbsenceStartDay(parseInt(v))}>
                    <SelectTrigger className="text-xs mt-1 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {daysOfWeek.map((day, i) => (
                        <SelectItem key={day} value={i.toString()} className="text-xs capitalize">{day} {formatDate(currentWeekDates[i])}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px] font-medium text-muted-foreground">Date de fin</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-start text-xs mt-1 h-8">
                        <CalendarIcon className="h-3 w-3 mr-1.5 flex-shrink-0" />
                        <span className="truncate">
                          {absenceEndDate ? format(absenceEndDate, 'dd/MM/yy', { locale: fr }) : 'Choisir...'}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={absenceEndDate || undefined}
                        onSelect={(date) => setAbsenceEndDate(date || null)}
                        locale={fr}
                        defaultMonth={currentWeekDates[absenceStartDay]}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <Button size="sm" onClick={applyAbsence} disabled={absenceLoading || !absenceEmployeeId || !absenceEndDate} className="w-full">
                {absenceLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <><CalendarIcon className="h-3.5 w-3.5 mr-1.5" /> Valider l'absence</>
                )}
              </Button>
            </div>
          </SidebarSection>

          {/* Employee colors */}
          <SidebarSection title="Couleurs employés" icon={Palette}>
            <div className="space-y-1.5">
              {employees.map((emp) => (
                <div key={emp.id} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-4 h-4 rounded-full shadow-sm border border-black/10" style={{ backgroundColor: emp.color }} />
                  <span className="text-xs font-medium flex-1">{emp.name}</span>
                  <div className="flex gap-1">
                    {EMPLOYEE_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={async () => {
                          const response = await fetch(`/api/employees/${emp.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ color }),
                          });
                          if (response.ok) {
                            setEmployees((prev: any[]) => prev.map((e: any) => e.id === emp.id ? { ...e, color } : e));
                            toast({ title: 'Couleur modifiée' });
                          }
                        }}
                        className={cn(
                          'w-5 h-5 rounded-full border-2 transition-transform hover:scale-110',
                          emp.color === color ? 'border-foreground scale-110 ring-1 ring-offset-1 ring-foreground/20' : 'border-transparent'
                        )}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SidebarSection>
        </div>
      </div>
    </>
  );
}
