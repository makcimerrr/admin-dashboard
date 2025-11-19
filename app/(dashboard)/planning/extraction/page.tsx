'use client';

import { useEffect, useState } from 'react';
import { DatePickerDemo } from '@/components/date-picker';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { addDays, isAfter, parseISO } from 'date-fns';
import { Calendar, Clock, LayoutTemplate, Users, Loader2 } from 'lucide-react';
import { useUser } from "@stackframe/stack";
import { PageHeader } from '@/components/planning/page-header';
import { PlanningNavigation } from '@/components/planning/planning-navigation';
import { DataTable } from '@/components/planning/data-table';
import { LoadingState } from '@/components/planning/loading-state';

interface Employee {
  id: string;
  name: string;
  hoursPerWeek?: string;
}

interface ExtractionRow {
  employee: Employee;
  overtime: number;
  nightHours: number;
  nightAndHoliday: number;
  holidayAndSunday: number;
  vacationDays: number;
  sickDays: number;
  trCount: number;
}

function getWeekKey(date: Date) {
  const year = date.getFullYear();
  const firstJan = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor(
    (date.getTime() - firstJan.getTime()) / (24 * 60 * 60 * 1000)
  );
  const week = Math.ceil((days + firstJan.getDay() + 1) / 7);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

function getDayName(date: Date) {
  return [
    'dimanche',
    'lundi',
    'mardi',
    'mercredi',
    'jeudi',
    'vendredi',
    'samedi'
  ][date.getDay()];
}

function getDaysInRange(start: string, end: string): Date[] {
  const res = [];
  let d = parseISO(start);
  const endDate = parseISO(end);
  while (!isAfter(d, endDate)) {
    res.push(d);
    d = addDays(d, 1);
  }
  return res;
}

function slotDuration(start: string, end: string) {
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  return (h2 * 60 + m2 - (h1 * 60 + m1)) / 60;
}

function nightHours(start: string, end: string) {
  const nightStart = 21 * 60;
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  const s = h1 * 60 + m1;
  const e = h2 * 60 + m2;
  if (e <= nightStart) return 0;
  return Math.max(0, (Math.min(e, 24 * 60) - Math.max(s, nightStart)) / 60);
}

export default function ExtractionPage() {
  const [start, setStart] = useState<string | undefined>(undefined);
  const [end, setEnd] = useState<string | undefined>(undefined);
  const [rows, setRows] = useState<ExtractionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const stackUser = useUser();
  const planningPermission = stackUser
    ? (stackUser.clientReadOnlyMetadata?.planningPermission ||
       stackUser.clientMetadata?.planningPermission ||
       'reader')
    : 'reader';

  useEffect(() => {
    fetch('/api/employees')
      .then((res) => res.json())
      .then((data) => setEmployees(data));
  }, []);

  const handleExtract = async () => {
    if (!start || !end) return;
    setLoading(true);

    const days = getDaysInRange(start, end);
    const weekKeys = Array.from(new Set(days.map(getWeekKey)));
    const dayMap = days.reduce(
      (acc, d) => {
        const key = `${getWeekKey(d)}|${getDayName(d)}`;
        acc[key] = d;
        return acc;
      },
      {} as Record<string, Date>
    );

    const results: ExtractionRow[] = [];
    for (const emp of employees) {
      let night = 0;
      let nightAndHoliday = 0;
      let holidayAndSunday = 0;
      let vacationDays = 0;
      let sickDays = 0;
      let trCount = 0;
      let slotsCounted: Set<string> = new Set();
      let weekCount = new Set<string>();
      let totalHours = 0;
      let daysWorked = 0;
      let daysWithAnyWork = 0;

      for (const weekKey of weekKeys) {
        const res = await fetch(
          `/api/schedules?employeeId=${emp.id}&weekKey=${weekKey}`
        );
        const schedules = await res.json();

        for (const sched of schedules) {
          if (sched.employeeId !== emp.id) continue;
          const key = `${sched.weekKey}|${sched.day}`;
          if (!dayMap[key]) continue;

          const isWeekend = sched.day === 'samedi' || sched.day === 'dimanche';
          weekCount.add(sched.weekKey);
          let workHoursForDay = 0;
          let isVacation = false;
          let isSick = false;
          let hasAnyWork = false;

          for (const slot of sched.timeSlots) {
            if (slot.type === 'work') {
              let dur = slotDuration(slot.start, slot.end);
              totalHours += dur;
              night += nightHours(slot.start, slot.end);
              if (slot.isHoliday)
                nightAndHoliday += nightHours(slot.start, slot.end);
              if (slot.isHoliday || slot.isSunday) holidayAndSunday += dur;
              workHoursForDay += dur;
              hasAnyWork = true;
            }
            if (
              slot.type === 'vacation' &&
              !slotsCounted.has(key) &&
              !isWeekend
            ) {
              vacationDays++;
              slotsCounted.add(key);
              isVacation = true;
            }
            if (slot.type === 'sick' && !slotsCounted.has(key)) {
              sickDays++;
              slotsCounted.add(key);
              isSick = true;
            }
          }

          if (!isVacation && !isSick && hasAnyWork) {
            daysWithAnyWork++;
          }
          if (!isVacation && !isSick && workHoursForDay >= 6) {
            daysWorked++;
          }
        }
      }

      if (emp.id === '98985543-5c55-4185-9fb9-2ee3d516113b') {
        trCount = Math.ceil(daysWithAnyWork / 2);
      } else {
        trCount = daysWorked;
      }

      const quota = emp.hoursPerWeek ? parseFloat(emp.hoursPerWeek) : 35;
      const overtime = totalHours - weekCount.size * quota;

      results.push({
        employee: emp,
        overtime: Math.round(overtime * 100) / 100,
        nightHours: Math.round(night * 100) / 100,
        nightAndHoliday: Math.round(nightAndHoliday * 100) / 100,
        holidayAndSunday: Math.round(holidayAndSunday * 100) / 100,
        vacationDays,
        sickDays,
        trCount
      });
    }

    setRows(results);
    setLoading(false);
  };

  const columns = [
    {
      key: 'employee' as keyof ExtractionRow,
      header: 'Employé',
      render: (value: Employee) => (
        <div className="font-medium">{value.name}</div>
      )
    },
    {
      key: 'nightHours' as keyof ExtractionRow,
      header: 'Heures nuit',
      render: (value: number) => <Badge variant="outline">{value}</Badge>
    },
    {
      key: 'nightAndHoliday' as keyof ExtractionRow,
      header: 'Heures nuits + férié',
      render: (value: number) => <Badge variant="outline">{value}</Badge>
    },
    {
      key: 'holidayAndSunday' as keyof ExtractionRow,
      header: 'Heures fériés / dimanche',
      render: (value: number) => <Badge variant="outline">{value}</Badge>
    },
    {
      key: 'vacationDays' as keyof ExtractionRow,
      header: 'Congés',
      render: (value: number) => <Badge variant="secondary">{value}</Badge>
    },
    {
      key: 'sickDays' as keyof ExtractionRow,
      header: 'Maladie',
      render: (value: number) => <Badge variant="destructive">{value}</Badge>
    },
    {
      key: 'trCount' as keyof ExtractionRow,
      header: 'TR',
      render: (value: number) => <Badge variant="default">{value}</Badge>
    }
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Extraction"
        subtitle="Extraction des heures et statistiques"
        icon={LayoutTemplate}
      />

      {/* Navigation */}
      <PlanningNavigation planningPermission={planningPermission} />

      {/* Filter Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Paramètres d'extraction</CardTitle>
          <CardDescription>
            Sélectionnez la période pour extraire les données de planning
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date de début</label>
              <DatePickerDemo
                value={start}
                onChange={setStart}
                className="w-[180px]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date de fin</label>
              <DatePickerDemo
                value={end}
                onChange={setEnd}
                className="w-[180px]"
              />
            </div>
            <Button
              onClick={handleExtract}
              disabled={!start || !end || loading}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Extraction en cours...
                </>
              ) : (
                <>
                  <LayoutTemplate className="h-4 w-4" />
                  Extraire les données
                </>
              )}
            </Button>
            {start && end && (
              <div className="flex-1 min-w-[200px]">
                <p className="text-sm text-muted-foreground">
                  Période : <span className="font-medium text-foreground">
                    {Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24))} jours
                  </span>
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Résultats de l'extraction</CardTitle>
          <CardDescription>
            {rows.length > 0
              ? `${rows.length} employé(s) trouvé(s) pour la période sélectionnée`
              : 'Aucune donnée à afficher'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState type="spinner" />
          ) : (
            <DataTable
              data={rows}
              columns={columns}
              emptyMessage="Aucune donnée à afficher. Sélectionnez une période et cliquez sur 'Extraire'."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
