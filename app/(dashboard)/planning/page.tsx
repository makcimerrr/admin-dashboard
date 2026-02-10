'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, LayoutTemplate, Users, Clock, List, Grid } from 'lucide-react';
import { useToast } from '@/components/hooks/use-toast';
import { useUser } from '@stackframe/stack';
import { PlanningPageHeader } from '@/components/planning/planning-page-header';
import { WeekSelector } from '@/components/planning/week-selector';
import { PlanningToolbar, type PaintMode, type SlotType } from '@/components/planning/planning-toolbar';
import { PlanningGrid } from '@/components/planning/planning-grid';
import { PlanningSidebar } from '@/components/planning/planning-sidebar';
import {
  getWeekDates,
  getWeekNumber,
  getWeekKey,
  formatDate,
} from '@/lib/db/utils';
import type { Employee } from '@/lib/db/schema/employees';
import type { TimeSlot } from '@/lib/db/schema/schedules';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EmployeeWithSchedule extends Employee {
  schedule: { [weekKey: string]: { [day: string]: TimeSlot[] } };
}

const daysOfWeek = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

const slotTypeConfig: Record<string, { label: string; bgColor: string; borderColor: string; textColor: string }> = {
  work: { label: 'Travail', bgColor: 'bg-blue-50 dark:bg-blue-950/30', borderColor: 'border-blue-200 dark:border-blue-800', textColor: 'text-blue-800 dark:text-blue-400' },
  vacation: { label: 'Congés', bgColor: 'bg-orange-50 dark:bg-orange-950/30', borderColor: 'border-orange-200 dark:border-orange-800', textColor: 'text-orange-800 dark:text-orange-400' },
  sick: { label: 'Arrêt maladie', bgColor: 'bg-red-50 dark:bg-red-950/30', borderColor: 'border-red-200 dark:border-red-800', textColor: 'text-red-800 dark:text-red-400' },
  personal: { label: 'Personnel', bgColor: 'bg-purple-50 dark:bg-purple-950/30', borderColor: 'border-purple-200 dark:border-purple-800', textColor: 'text-purple-800 dark:text-purple-400' },
};

export default function PlanningPage() {
  const stackUser = useUser();
  const planningPermission = stackUser
    ? ((stackUser.clientReadOnlyMetadata?.planningPermission || stackUser.clientMetadata?.planningPermission || 'reader') as string)
    : 'reader';
  const isEditor = planningPermission === 'editor';

  const { toast } = useToast();

  // Core state
  const [employees, setEmployees] = useState<EmployeeWithSchedule[]>([]);
  const [schedules, setSchedules] = useState<Record<string, TimeSlot[]>>({});
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  // Paint state
  const [activeEmployeeId, setActiveEmployeeId] = useState<string | null>(null);
  const [paintMode, setPaintMode] = useState<PaintMode>('paint');
  const [slotType, setSlotType] = useState<SlotType>('work');

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'person' | 'table'>('grid');

  // Holidays
  const [holidays, setHolidays] = useState<Record<string, string>>({});

  // Derived
  const currentWeekDates = useMemo(() => getWeekDates(currentWeekOffset), [currentWeekOffset]);
  const currentWeekKey = useMemo(() => getWeekKey(currentWeekOffset), [currentWeekOffset]);

  // Hackaton state
  const [hackatonWeeks, setHackatonWeeks] = useState<Record<string, boolean>>({});
  const isHackaton = !!hackatonWeeks[currentWeekKey];
  const weekNumber = useMemo(() => getWeekNumber(currentWeekDates[0]), [currentWeekDates]);

  // Load employees
  useEffect(() => {
    fetch('/api/employees')
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setEmployees(data.map((e: Employee) => ({ ...e, schedule: {} }))))
      .catch(() => toast({ title: 'Erreur', description: 'Impossible de charger les employés', variant: 'destructive' }));
  }, []);

  // Load schedules
  const loadSchedules = useCallback(async () => {
    if (employees.length === 0) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/schedules?weekKey=${currentWeekKey}`);
      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      const schedulesMap: Record<string, TimeSlot[]> = {};
      if (Array.isArray(data)) {
        data.forEach((s: any) => {
          schedulesMap[`${s.employeeId}-${s.day}`] = Array.isArray(s.timeSlots) ? s.timeSlots : [];
        });
      }
      setSchedules(schedulesMap);
      setEmployees((prev) =>
        prev.map((emp) => ({
          ...emp,
          schedule: {
            ...emp.schedule,
            [currentWeekKey]: daysOfWeek.reduce((acc, day) => {
              acc[day] = schedulesMap[`${emp.id}-${day}`] || [];
              return acc;
            }, {} as Record<string, TimeSlot[]>),
          },
        }))
      );
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger les plannings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [currentWeekKey, employees.length]);

  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  // Load hackaton state
  useEffect(() => {
    fetch(`/api/hackaton-week?weekKey=${currentWeekKey}`)
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.isHackaton === 'boolean') {
          setHackatonWeeks((w) => ({ ...w, [currentWeekKey]: d.isHackaton }));
        }
      })
      .catch(() => {});
  }, [currentWeekKey]);

  // Load holidays
  useEffect(() => {
    fetch('https://etalab.github.io/jours-feries-france-data/json/metropole.json')
      .then((r) => r.json())
      .then(setHolidays)
      .catch(() => {});
  }, []);

  // Toggle hackaton
  const handleToggleHackaton = (checked: boolean) => {
    setHackatonWeeks((w) => ({ ...w, [currentWeekKey]: checked }));
    fetch('/api/hackaton-week', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekKey: currentWeekKey, isHackaton: checked }),
    });
  };

  // Core functions
  const getEmployeeScheduleForDay = useCallback((employeeId: string, day: string): TimeSlot[] => {
    return schedules[`${employeeId}-${day}`] || [];
  }, [schedules]);

  const getTotalHoursForWeek = useCallback((employeeId: string): number => {
    let total = 0;
    for (const day of daysOfWeek) {
      const slots = getEmployeeScheduleForDay(employeeId, day);
      for (const slot of slots.filter((s) => s.type === 'work')) {
        const sh = parseInt(slot.start.split(':')[0]) + parseInt(slot.start.split(':')[1]) / 60;
        const eh = parseInt(slot.end.split(':')[0]) + parseInt(slot.end.split(':')[1]) / 60;
        total += eh - sh;
      }
    }
    return Math.round(total * 10) / 10;
  }, [getEmployeeScheduleForDay]);

  const updateLocalSchedule = useCallback(async (employeeId: string, day: string, timeSlots: TimeSlot[], weekKey?: string) => {
    const wk = weekKey || currentWeekKey;
    try {
      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, weekKey: wk, day, timeSlots }),
      });
      if (!response.ok) throw new Error('Failed');

      // Optimistic update
      setSchedules((prev) => ({ ...prev, [`${employeeId}-${day}`]: timeSlots }));
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === employeeId
            ? { ...emp, schedule: { ...emp.schedule, [wk]: { ...emp.schedule[wk], [day]: timeSlots } } }
            : emp
        )
      );

      // Reload for consistency
      const schedulesResponse = await fetch(`/api/schedules?weekKey=${wk}`);
      if (schedulesResponse.ok) {
        const data = await schedulesResponse.json();
        const schedulesMap: Record<string, TimeSlot[]> = {};
        if (Array.isArray(data)) {
          data.forEach((s: any) => {
            schedulesMap[`${s.employeeId}-${s.day}`] = Array.isArray(s.timeSlots) ? s.timeSlots : [];
          });
        }
        setSchedules(schedulesMap);
        setEmployees((prev) =>
          prev.map((emp) => ({
            ...emp,
            schedule: {
              ...emp.schedule,
              [wk]: daysOfWeek.reduce((acc, d) => {
                acc[d] = schedulesMap[`${emp.id}-${d}`] || [];
                return acc;
              }, {} as Record<string, TimeSlot[]>),
            },
          }))
        );
      }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de mettre à jour le planning', variant: 'destructive' });
    }
  }, [currentWeekKey, toast]);

  const getOverlappingTimeSlots = useCallback((day: string) => {
    const slots: Array<{ employee: EmployeeWithSchedule; slot: TimeSlot; startHour: number; endHour: number }> = [];
    employees.forEach((employee) => {
      const daySchedule = getEmployeeScheduleForDay(employee.id, day);
      daySchedule.forEach((slot) => {
        if ((day === 'samedi' || day === 'dimanche') && slot.type === 'vacation') return;
        const startHour = parseInt(slot.start.split(':')[0]) + parseInt(slot.start.split(':')[1]) / 60;
        const endHour = parseInt(slot.end.split(':')[0]) + parseInt(slot.end.split(':')[1]) / 60;
        slots.push({ employee, slot, startHour, endHour });
      });
    });
    return slots.sort((a, b) => a.startHour - b.startHour);
  }, [employees, getEmployeeScheduleForDay]);

  const handleSaturdayEmployeeChange = useCallback(async (employeeId: string, day: string) => {
    for (const emp of employees) {
      await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: emp.id, weekKey: currentWeekKey, day, timeSlots: [] }),
      });
    }
    if (employeeId) {
      await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          weekKey: currentWeekKey,
          day,
          timeSlots: [{ start: '10:00', end: '20:00', isWorking: true, type: 'work' }],
        }),
      });
    }
    await loadSchedules();
  }, [employees, currentWeekKey, loadSchedules]);

  if (loading && employees.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] p-3 gap-2 overflow-hidden">
      {/* Header */}
      <PlanningPageHeader
        title="Planning"
        subtitle={isEditor ? 'Cliquez sur un crayon puis peignez la grille' : 'Consultation'}
        icon={LayoutTemplate}
        permission={planningPermission}
      >
        <WeekSelector
          currentWeekOffset={currentWeekOffset}
          setCurrentWeekOffset={setCurrentWeekOffset}
          currentWeekDates={currentWeekDates}
          weekNumber={weekNumber}
        />

        {isEditor && (
          <label className="flex items-center gap-1.5 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={isHackaton}
              onChange={(e) => handleToggleHackaton(e.target.checked)}
              className="accent-pink-600 w-4 h-4"
            />
            <span className="font-semibold text-pink-600">Hackaton</span>
          </label>
        )}

        {/* View switcher */}
        <div className="inline-flex rounded-md bg-muted p-0.5">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="h-7 px-2 text-xs"
          >
            <Grid className="h-3 w-3 mr-1" />
            Grille
          </Button>
          <Button
            variant={viewMode === 'person' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('person')}
            className="h-7 px-2 text-xs"
          >
            <Users className="h-3 w-3 mr-1" />
            Personne
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="h-7 px-2 text-xs"
          >
            <List className="h-3 w-3 mr-1" />
            Tableau
          </Button>
        </div>
      </PlanningPageHeader>

      {/* Toolbar (only in grid view) */}
      {viewMode === 'grid' && (
        <div className="flex-shrink-0">
          <PlanningToolbar
            employees={employees}
            activeEmployeeId={activeEmployeeId}
            paintMode={paintMode}
            slotType={slotType}
            isEditor={isEditor}
            getTotalHoursForWeek={getTotalHoursForWeek}
            onSelectEmployee={setActiveEmployeeId}
            onSetPaintMode={setPaintMode}
            onSetSlotType={setSlotType}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : viewMode === 'grid' ? (
          <PlanningGrid
            employees={employees}
            daysOfWeek={daysOfWeek}
            currentWeekDates={currentWeekDates}
            isHackaton={isHackaton}
            isEditor={isEditor}
            holidays={holidays}
            activeEmployeeId={activeEmployeeId}
            paintMode={paintMode}
            slotType={slotType}
            getEmployeeScheduleForDay={getEmployeeScheduleForDay}
            getOverlappingTimeSlots={getOverlappingTimeSlots}
            updateLocalSchedule={updateLocalSchedule}
            handleSaturdayEmployeeChange={handleSaturdayEmployeeChange}
            onSlotDeleted={() => toast({ title: 'Créneau supprimé' })}
            onDeselectEmployee={() => { setActiveEmployeeId(null); setPaintMode('paint'); }}
          />
        ) : viewMode === 'person' ? (
          <PersonView
            employees={employees}
            daysOfWeek={daysOfWeek}
            currentWeekDates={currentWeekDates}
            getEmployeeScheduleForDay={getEmployeeScheduleForDay}
            getTotalHoursForWeek={getTotalHoursForWeek}
            slotTypeConfig={slotTypeConfig}
          />
        ) : (
          <TableView
            employees={employees}
            daysOfWeek={daysOfWeek}
            currentWeekDates={currentWeekDates}
            getEmployeeScheduleForDay={getEmployeeScheduleForDay}
            getTotalHoursForWeek={getTotalHoursForWeek}
            slotTypeConfig={slotTypeConfig}
          />
        )}
      </div>

      {/* Footer: total hours per employee */}
      {viewMode === 'grid' && !loading && (
        <div className="flex-shrink-0 flex items-center gap-3 px-2 py-1.5 bg-muted/30 rounded-lg border text-xs overflow-x-auto">
          <span className="text-muted-foreground font-medium flex-shrink-0">Totaux :</span>
          {employees.map((emp) => (
            <div key={emp.id} className="flex items-center gap-1.5 flex-shrink-0">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: emp.color }} />
              <span className="font-medium">{emp.initial || emp.name.split(' ').map((n) => n[0]).join('')}</span>
              <span className="text-muted-foreground">{getTotalHoursForWeek(emp.id)}h</span>
            </div>
          ))}
        </div>
      )}

      {/* Sidebar */}
      <PlanningSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        employees={employees}
        daysOfWeek={daysOfWeek}
        currentWeekOffset={currentWeekOffset}
        currentWeekKey={currentWeekKey}
        currentWeekDates={currentWeekDates}
        updateLocalSchedule={updateLocalSchedule}
        reloadSchedules={loadSchedules}
        setEmployees={setEmployees}
        setSchedules={setSchedules}
      />
    </div>
  );
}

// Person view (secondary)
function PersonView({
  employees,
  daysOfWeek,
  currentWeekDates,
  getEmployeeScheduleForDay,
  getTotalHoursForWeek,
  slotTypeConfig,
}: {
  employees: Employee[];
  daysOfWeek: string[];
  currentWeekDates: Date[];
  getEmployeeScheduleForDay: (id: string, day: string) => TimeSlot[];
  getTotalHoursForWeek: (id: string) => number;
  slotTypeConfig: Record<string, { label: string; bgColor: string; borderColor: string; textColor: string }>;
}) {
  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-1">
        {employees.map((employee) => (
          <div
            key={employee.id}
            className="rounded-xl border bg-background p-3 border-l-4"
            style={{ borderLeftColor: employee.color || '#8884d8' }}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <Avatar className="h-9 w-9 ring-2 ring-offset-1" style={{ ['--tw-ring-color' as string]: employee.color || '#8884d8' }}>
                <AvatarImage src={`https://avatar.vercel.sh/${employee.id}.png`} alt={employee.name} />
                <AvatarFallback className="text-xs font-bold">{employee.name.split(' ').map((n) => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm leading-tight">{employee.name}</div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  {employee.role}
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-bold" style={{ borderColor: employee.color || '#8884d8', color: employee.color || '#8884d8' }}>
                    {getTotalHoursForWeek(employee.id)}h
                  </Badge>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              {daysOfWeek.map((day, i) => {
                const slots = getEmployeeScheduleForDay(employee.id, day);
                const filtered = (day === 'samedi' || day === 'dimanche') ? slots.filter((s) => s.type !== 'vacation') : slots;
                return (
                  <div key={day} className="flex items-center gap-2 text-xs">
                    <span className="w-16 font-medium text-[11px] capitalize text-muted-foreground">{day}</span>
                    {filtered.length === 0 ? (
                      <span className="text-[10px] italic text-muted-foreground">Repos</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {filtered.map((slot, idx) => {
                          const config = slotTypeConfig[slot.type];
                          return (
                            <span key={idx} className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${config?.bgColor} ${config?.textColor} border ${config?.borderColor}`}>
                              {config?.label} {slot.start}-{slot.end}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

// Table view (secondary)
function TableView({
  employees,
  daysOfWeek,
  currentWeekDates,
  getEmployeeScheduleForDay,
  getTotalHoursForWeek,
  slotTypeConfig,
}: {
  employees: Employee[];
  daysOfWeek: string[];
  currentWeekDates: Date[];
  getEmployeeScheduleForDay: (id: string, day: string) => TimeSlot[];
  getTotalHoursForWeek: (id: string) => number;
  slotTypeConfig: Record<string, { label: string; bgColor: string; borderColor: string; textColor: string }>;
}) {
  const renderCell = (employeeId: string, day: string) => {
    const slots = getEmployeeScheduleForDay(employeeId, day);
    const workSlots = slots.filter((s) => s.type === 'work');
    const otherSlots = slots.filter((s) => s.type !== 'work');
    if (workSlots.length === 0 && otherSlots.length === 0) {
      return <span className="text-[10px] italic text-muted-foreground">Repos</span>;
    }
    return (
      <div className="flex flex-col items-center gap-0.5">
        {workSlots.map((s, i) => (
          <span key={i} className="text-[10px] font-medium">{s.start}-{s.end}</span>
        ))}
        {otherSlots.map((s, i) => {
          const config = slotTypeConfig[s.type];
          return (
            <span key={`o${i}`} className={`px-1 py-0 rounded text-[9px] font-bold ${config?.bgColor} ${config?.textColor} border ${config?.borderColor}`}>
              {config?.label}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="rounded-lg border bg-background overflow-hidden">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
            <tr className="border-b">
              <th className="text-left p-2 text-[11px] uppercase tracking-wider font-medium text-muted-foreground sticky left-0 bg-muted/80 backdrop-blur-sm z-20">Employé</th>
              {daysOfWeek.map((day, i) => (
                <th key={day} className="text-center p-2 text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
                  <div>{day.slice(0, 3)}.</div>
                  <div className="text-[9px] font-normal">{formatDate(currentWeekDates[i])}</div>
                </th>
              ))}
              <th className="text-center p-2 text-[11px] uppercase tracking-wider font-medium text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id} className="border-b hover:bg-muted/30 align-middle">
                <td className="p-2 sticky left-0 bg-background z-10">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: employee.color || '#8884d8' }} />
                    <span className="font-medium text-xs">{employee.name}</span>
                  </div>
                </td>
                {daysOfWeek.map((day) => (
                  <td key={day} className="p-2 text-center">{renderCell(employee.id, day)}</td>
                ))}
                <td className="p-2 text-center font-bold text-xs" style={{ color: employee.color || '#8884d8' }}>
                  {getTotalHoursForWeek(employee.id)}h
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScrollArea>
  );
}
