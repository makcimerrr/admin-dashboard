'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, LayoutTemplate, Users, Clock, List, Grid } from 'lucide-react';
import { useToast } from '@/components/hooks/use-toast';
import { useUser } from '@stackframe/stack';
import { useIsMobile } from '@/components/hooks/use-mobile';
import { PageHeader } from '@/components/page-header';
import { WeekSelector } from '@/components/planning/week-selector';
import { PlanningToolbar, type PaintMode, type SlotType } from '@/components/planning/planning-toolbar';
import { PlanningGrid } from '@/components/planning/planning-grid';
import { PlanningSidebar } from '@/components/planning/planning-sidebar';
import { MobileDayView } from '@/components/planning/mobile-day-view';
import { PersonView } from '@/components/planning/person-view';
import { TableView } from '@/components/planning/table-view';
import {
  getWeekDates,
  getWeekNumber,
  getWeekKey,
} from '@/lib/db/utils';
import type { Employee } from '@/lib/db/schema/employees';
import type { TimeSlot } from '@/lib/db/schema/schedules';

interface EmployeeWithSchedule extends Employee {
  schedule: { [weekKey: string]: { [day: string]: TimeSlot[] } };
}

const daysOfWeek = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

const slotTypeConfig: Record<string, { label: string; bgColor: string; borderColor: string; textColor: string }> = {
  work: { label: 'Travail', bgColor: 'bg-primary/10', borderColor: 'border-primary/30', textColor: 'text-primary' },
  vacation: { label: 'Congés', bgColor: 'bg-warning/10', borderColor: 'border-warning/30', textColor: 'text-warning' },
  sick: { label: 'Arrêt maladie', bgColor: 'bg-destructive/10', borderColor: 'border-destructive/30', textColor: 'text-destructive' },
  personal: { label: 'Personnel', bgColor: 'bg-muted', borderColor: 'border-border', textColor: 'text-muted-foreground' },
};

export default function PlanningPage() {
  const stackUser = useUser();
  const planningPermission = stackUser
    ? ((stackUser.clientReadOnlyMetadata?.planningPermission || stackUser.clientMetadata?.planningPermission || 'reader') as string)
    : 'reader';
  const isEditor = planningPermission === 'editor';
  const isMobile = useIsMobile();

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
  // Count of in-flight save requests. The grid edits optimistically, so instead
  // of blocking the UI we surface a small "Enregistrement…" pill while > 0.
  const [savingCount, setSavingCount] = useState(0);

  // Defer mobile-dependent rendering until after mount to avoid hydration
  // mismatches (SSR always renders as desktop; the mobile view would otherwise
  // swap in mid-commit and can break Suspense boundaries).
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Mobile gets its own dedicated read-only view (no edit, horizontal day-by-day)
  // On desktop, grid/person/table work normally.
  const effectiveViewMode = mounted && isMobile ? 'mobile' : viewMode;

  // Holidays
  const [holidays, setHolidays] = useState<Record<string, string>>({});

  // Derived
  const currentWeekDates = useMemo(() => getWeekDates(currentWeekOffset), [currentWeekOffset]);
  const currentWeekKey = useMemo(() => getWeekKey(currentWeekOffset), [currentWeekOffset]);

  // Hackaton & Piscine state
  const [hackatonWeeks, setHackatonWeeks] = useState<Record<string, boolean>>({});
  const [piscineWeeks, setPiscineWeeks] = useState<Record<string, boolean>>({});
  const isHackaton = !!hackatonWeeks[currentWeekKey];
  const isPiscine = !!piscineWeeks[currentWeekKey];
  const weekNumber = useMemo(() => getWeekNumber(currentWeekDates[0]), [currentWeekDates]);

  // Apply a freshly-fetched schedules map onto state. Splitting the network
  // fetch from this merge lets us load employees + schedules in PARALLEL on
  // first paint (decascade) instead of waiting for employees before firing
  // the schedules request.
  const applySchedulesMap = useCallback((schedulesMap: Record<string, TimeSlot[]>, weekKey: string) => {
    setSchedules(schedulesMap);
    setEmployees((prev) =>
      prev.map((emp) => ({
        ...emp,
        schedule: {
          ...emp.schedule,
          [weekKey]: daysOfWeek.reduce((acc, day) => {
            acc[day] = schedulesMap[`${emp.id}-${day}`] || [];
            return acc;
          }, {} as Record<string, TimeSlot[]>),
        },
      }))
    );
  }, []);

  // Fetch the raw schedules for a week (no state dependency → safe to run in
  // parallel with the employees fetch).
  const fetchSchedulesMap = useCallback(async (weekKey: string): Promise<Record<string, TimeSlot[]>> => {
    const response = await fetch(`/api/schedules?weekKey=${weekKey}`);
    if (!response.ok) throw new Error('Failed');
    const data = await response.json();
    const schedulesMap: Record<string, TimeSlot[]> = {};
    if (Array.isArray(data)) {
      data.forEach((s: any) => {
        schedulesMap[`${s.employeeId}-${s.day}`] = Array.isArray(s.timeSlots) ? s.timeSlots : [];
      });
    }
    return schedulesMap;
  }, []);

  // Tracks the week we last merged schedules for, so the week-change effect
  // doesn't redundantly re-fetch the week already loaded by the initial
  // parallel load.
  const loadedWeekRef = useRef<string | null>(null);

  // Initial load — employees AND schedules fired together (decascade), plus
  // hackaton/piscine/holidays which were already independent of employees.
  // Sort employees alphabetically so the order is stable across sessions,
  // weeks, days and viewports (desktop grid/person/table + mobile).
  useEffect(() => {
    let cancelled = false;
    const weekKey = currentWeekKey;
    setLoading(true);
    Promise.all([
      fetch('/api/employees').then((res) => (res.ok ? res.json() : [])) as Promise<Employee[]>,
      fetchSchedulesMap(weekKey).catch(() => null),
    ])
      .then(([employeesData, schedulesMap]) => {
        if (cancelled) return;
        const sorted = [...employeesData].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
        if (schedulesMap) {
          setSchedules(schedulesMap);
          setEmployees(
            sorted.map((e) => ({
              ...e,
              schedule: {
                [weekKey]: daysOfWeek.reduce((acc, day) => {
                  acc[day] = schedulesMap[`${e.id}-${day}`] || [];
                  return acc;
                }, {} as Record<string, TimeSlot[]>),
              },
            }))
          );
          loadedWeekRef.current = weekKey;
        } else {
          setEmployees(sorted.map((e) => ({ ...e, schedule: {} })));
          toast({ title: 'Erreur', description: 'Impossible de charger les plannings', variant: 'destructive' });
        }
      })
      .catch(() => {
        if (!cancelled) toast({ title: 'Erreur', description: 'Impossible de charger les employés', variant: 'destructive' });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // Initial-load-only: subsequent week changes are handled by the schedules
    // effect below. (currentWeekKey is captured for the first paint.)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload schedules — used on week change and after saves. Relies on the
  // already-loaded employees list to merge onto.
  const loadSchedules = useCallback(async () => {
    if (employees.length === 0) return;
    setLoading(true);
    try {
      const schedulesMap = await fetchSchedulesMap(currentWeekKey);
      applySchedulesMap(schedulesMap, currentWeekKey);
      loadedWeekRef.current = currentWeekKey;
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger les plannings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [currentWeekKey, employees.length, fetchSchedulesMap, applySchedulesMap]);

  // Reload schedules when the selected week changes (the initial week is
  // already covered by the parallel load above).
  useEffect(() => {
    if (employees.length === 0) return;
    if (loadedWeekRef.current === currentWeekKey) return;
    loadSchedules();
  }, [currentWeekKey, employees.length, loadSchedules]);

  // Load hackaton & piscine state
  useEffect(() => {
    fetch(`/api/hackaton-week?weekKey=${currentWeekKey}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && typeof d.data?.isHackaton === 'boolean') {
          setHackatonWeeks((w) => ({ ...w, [currentWeekKey]: d.data.isHackaton }));
        }
      })
      .catch(() => {});
    fetch(`/api/piscine-week?weekKey=${currentWeekKey}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && typeof d.data?.isPiscine === 'boolean') {
          setPiscineWeeks((w) => ({ ...w, [currentWeekKey]: d.data.isPiscine }));
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
    setSavingCount((c) => c + 1);
    fetch('/api/hackaton-week', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekKey: currentWeekKey, isHackaton: checked }),
    }).finally(() => setSavingCount((c) => c - 1));
  };

  // Toggle piscine
  const handleTogglePiscine = (checked: boolean) => {
    setPiscineWeeks((w) => ({ ...w, [currentWeekKey]: checked }));
    setSavingCount((c) => c + 1);
    fetch('/api/piscine-week', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekKey: currentWeekKey, isPiscine: checked }),
    }).finally(() => setSavingCount((c) => c - 1));
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
    setSavingCount((c) => c + 1);
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
    } finally {
      setSavingCount((c) => c - 1);
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
    setSavingCount((c) => c + 1);
    try {
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
            timeSlots: [{ start: '10:00', end: '18:00', isWorking: true, type: 'work' }],
          }),
        });
      }
      await loadSchedules();
    } finally {
      setSavingCount((c) => c - 1);
    }
  }, [employees, currentWeekKey, loadSchedules]);

  if (loading && employees.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] p-2 md:p-3 gap-2 overflow-hidden">
      {/* Header */}
      <PageHeader
        icon={LayoutTemplate}
        title="Planning"
        description={isEditor ? 'Cliquez sur un crayon puis peignez la grille' : 'Consultation'}
        badge={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={planningPermission === 'editor' ? 'bg-success/15 text-success border-success/30' : 'bg-warning/15 text-warning border-warning/30'}>
              {planningPermission === 'editor' ? 'EDITOR' : 'READER'}
            </Badge>
            {savingCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Enregistrement…
              </span>
            )}
          </div>
        }
      >
        <WeekSelector
          currentWeekOffset={currentWeekOffset}
          setCurrentWeekOffset={setCurrentWeekOffset}
          currentWeekDates={currentWeekDates}
          weekNumber={weekNumber}
        />

        {isEditor && !isMobile && (
          <>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={isHackaton}
                onChange={(e) => handleToggleHackaton(e.target.checked)}
                className="accent-warning w-4 h-4"
              />
              <span className="font-semibold text-warning">Hackaton</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={isPiscine}
                onChange={(e) => handleTogglePiscine(e.target.checked)}
                className="accent-primary w-4 h-4"
              />
              <span className="font-semibold text-primary">Piscine</span>
            </label>
          </>
        )}

        {/* View switcher — desktop only */}
        {!isMobile && (
          <div className="inline-flex rounded-md bg-muted p-0.5">
            <Button
              variant={effectiveViewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-7 px-2 text-xs"
            >
              <Grid className="h-3 w-3 mr-1" />
              Grille
            </Button>
            <Button
              variant={effectiveViewMode === 'person' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('person')}
              className="h-7 px-2 text-xs"
            >
              <Users className="h-3 w-3 mr-1" />
              Personne
            </Button>
            <Button
              variant={effectiveViewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-7 px-2 text-xs"
            >
              <List className="h-3 w-3 mr-1" />
              Tableau
            </Button>
          </div>
        )}
      </PageHeader>

      {/* Toolbar (only in grid view on desktop) */}
      {effectiveViewMode === 'grid' && (
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
        ) : effectiveViewMode === 'mobile' ? (
          <MobileDayView
            employees={employees}
            daysOfWeek={daysOfWeek}
            currentWeekDates={currentWeekDates}
            getEmployeeScheduleForDay={getEmployeeScheduleForDay}
            slotTypeConfig={slotTypeConfig}
          />
        ) : effectiveViewMode === 'grid' ? (
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
        ) : effectiveViewMode === 'person' ? (
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
      {effectiveViewMode === 'grid' && !loading && (
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
