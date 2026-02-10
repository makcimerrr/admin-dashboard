'use client';

import { useEffect, useState } from 'react';
import { DatePickerDemo } from '@/components/date-picker';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { addDays, isAfter, parseISO } from 'date-fns';
import { FileBarChart, Loader2 } from 'lucide-react';
import { useUser } from "@stackframe/stack";
import { PlanningPageHeader } from '@/components/planning/planning-page-header';
import { FilterToolbar } from '@/components/planning/filter-toolbar';
import { EmployeeColorDot } from '@/components/planning/employee-color-dot';
import { DataTable } from '@/components/planning/data-table';

interface Employee {
  id: string;
  name: string;
  color?: string;
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
  const days = Math.floor((date.getTime() - firstJan.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + firstJan.getDay() + 1) / 7);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

function getDayName(date: Date) {
  return ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][date.getDay()];
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

function nightHoursCalc(start: string, end: string) {
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
    ? ((stackUser.clientReadOnlyMetadata?.planningPermission ||
       stackUser.clientMetadata?.planningPermission ||
       'reader') as string)
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
    const dayMap = days.reduce((acc, d) => {
      const key = `${getWeekKey(d)}|${getDayName(d)}`;
      acc[key] = d;
      return acc;
    }, {} as Record<string, Date>);

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
        const res = await fetch(`/api/schedules?employeeId=${emp.id}&weekKey=${weekKey}`);
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
              night += nightHoursCalc(slot.start, slot.end);
              if (slot.isHoliday) nightAndHoliday += nightHoursCalc(slot.start, slot.end);
              if (slot.isHoliday || slot.isSunday) holidayAndSunday += dur;
              workHoursForDay += dur;
              hasAnyWork = true;
            }
            if (slot.type === 'vacation' && !slotsCounted.has(key) && !isWeekend) {
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

          if (!isVacation && !isSick && hasAnyWork) daysWithAnyWork++;
          if (!isVacation && !isSick && workHoursForDay >= 6) daysWorked++;
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
        trCount,
      });
    }

    setRows(results);
    setLoading(false);
  };

  const dayCount = start && end
    ? Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const columns = [
    {
      key: 'employee' as keyof ExtractionRow,
      header: 'Employé',
      render: (value: Employee) => (
        <div className="flex items-center gap-2">
          <EmployeeColorDot color={value.color || '#8884d8'} />
          <span className="font-medium text-sm">{value.name}</span>
        </div>
      ),
    },
    {
      key: 'nightHours' as keyof ExtractionRow,
      header: 'Nuit',
      render: (value: number) => <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">{value}h</Badge>,
    },
    {
      key: 'nightAndHoliday' as keyof ExtractionRow,
      header: 'Nuit + férié',
      render: (value: number) => <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">{value}h</Badge>,
    },
    {
      key: 'holidayAndSunday' as keyof ExtractionRow,
      header: 'Féries / dim.',
      render: (value: number) => <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">{value}h</Badge>,
    },
    {
      key: 'vacationDays' as keyof ExtractionRow,
      header: 'Congés',
      render: (value: number) => (
        <Badge className="text-[10px] px-1.5 py-0 h-5 bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800" variant="outline">
          {value}j
        </Badge>
      ),
    },
    {
      key: 'sickDays' as keyof ExtractionRow,
      header: 'Maladie',
      render: (value: number) => (
        <Badge className="text-[10px] px-1.5 py-0 h-5 bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-800" variant="outline">
          {value}j
        </Badge>
      ),
    },
    {
      key: 'trCount' as keyof ExtractionRow,
      header: 'TR',
      render: (value: number) => <Badge variant="default" className="text-[10px] px-1.5 py-0 h-5">{value}</Badge>,
    },
    {
      key: 'overtime' as keyof ExtractionRow,
      header: 'Heures sup.',
      render: (value: number) => (
        <span className={`text-xs font-bold ${value > 0 ? 'text-green-600 dark:text-green-400' : value < 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
          {value > 0 ? '+' : ''}{value}h
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] p-3 gap-2 overflow-hidden">
      <PlanningPageHeader
        title="Extraction"
        subtitle="Extraction des heures et statistiques"
        icon={FileBarChart}
        permission={planningPermission}
      >
        <Button
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={handleExtract}
          disabled={!start || !end || loading}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileBarChart className="h-3 w-3" />}
          Extraire
        </Button>
      </PlanningPageHeader>

      <FilterToolbar>
        <DatePickerDemo value={start} onChange={setStart} className="h-8 w-[140px]" />
        <span className="text-xs text-muted-foreground">au</span>
        <DatePickerDemo value={end} onChange={setEnd} className="h-8 w-[140px]" />
        {start && end && dayCount > 0 && (
          <Badge variant="secondary" className="text-[10px] px-1.5 h-5">
            {dayCount} jours
          </Badge>
        )}
        {rows.length > 0 && (
          <Badge variant="outline" className="text-[10px] px-1.5 h-5">
            {rows.length} employé(s)
          </Badge>
        )}
      </FilterToolbar>

      <div className="flex-1 min-h-0 flex flex-col overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DataTable
            data={rows}
            columns={columns}
            emptyMessage="Sélectionnez une période et cliquez sur 'Extraire'."
          />
        )}
      </div>
    </div>
  );
}
