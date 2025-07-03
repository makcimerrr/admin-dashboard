"use client";

import { useEffect, useState } from "react";
import { DatePickerDemo } from "@/components/date-picker";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { addDays, format, isAfter, isBefore, isEqual, parseISO } from "date-fns";
import { Calendar, Users, LayoutTemplate } from 'lucide-react';
import Link from 'next/link';

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
  // getWeekNumber utilitaire simplifié
  const firstJan = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - firstJan.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + firstJan.getDay() + 1) / 7);
  return `${year}-W${week.toString().padStart(2, "0")}`;
}

function getDayName(date: Date) {
  return ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"][date.getDay()];
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
  const [h1, m1] = start.split(":").map(Number);
  const [h2, m2] = end.split(":").map(Number);
  return (h2 * 60 + m2 - (h1 * 60 + m1)) / 60;
}

function nightHours(start: string, end: string) {
  // Calcule la partie du créneau après 21h
  const nightStart = 21 * 60;
  const [h1, m1] = start.split(":").map(Number);
  const [h2, m2] = end.split(":").map(Number);
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

  // Charger la liste des employés
  useEffect(() => {
    fetch("/api/employees")
      .then((res) => res.json())
      .then((data) => setEmployees(data));
  }, []);

  // Handler pour lancer l'extraction (à compléter avec la logique réelle)
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

    // Pour chaque employé, charger tous les schedules de la période
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
      let daysWorked = 0; // Pour le cas spécial
      let daysWithAnyWork = 0; // Pour l'employé spécial
      for (const weekKey of weekKeys) {
        const res = await fetch(`/api/schedules?employeeId=${emp.id}&weekKey=${weekKey}`);
        const schedules = await res.json();
        for (const sched of schedules) {
          if (sched.employeeId !== emp.id) continue;
          const key = `${sched.weekKey}|${sched.day}`;
          if (!dayMap[key]) continue; // hors période
          // Ajout : ignorer samedi/dimanche pour les congés
          const isWeekend = sched.day === 'samedi' || sched.day === 'dimanche';
          weekCount.add(sched.weekKey);
          let workHoursForDay = 0;
          let isVacation = false;
          let isSick = false;
          let hasAnyWork = false;
          for (const slot of sched.timeSlots) {
            if (slot.type === "work") {
              let dur = slotDuration(slot.start, slot.end);
              totalHours += dur;
              night += nightHours(slot.start, slot.end);
              if (slot.isHoliday) nightAndHoliday += nightHours(slot.start, slot.end);
              if (slot.isHoliday || slot.isSunday) holidayAndSunday += dur;
              workHoursForDay += dur;
              hasAnyWork = true;
            }
            if (
              slot.type === "vacation" &&
              !slotsCounted.has(key) &&
              !isWeekend // <-- Ajout ici : ne compte pas samedi/dimanche
            ) {
              vacationDays++;
              slotsCounted.add(key);
              isVacation = true;
            }
            if (
              slot.type === "sick" &&
              !slotsCounted.has(key)
            ) {
              sickDays++;
              slotsCounted.add(key);
              isSick = true;
            }
          }
          // Pour l'employé spécial : compte tout jour avec au moins un créneau work
          if (!isVacation && !isSick && hasAnyWork) {
            daysWithAnyWork++;
          }
          // Pour les autres : on compte tous les jours (y compris samedi/dimanche) avec au moins 6h
          if (!isVacation && !isSick && workHoursForDay >= 6) {
            daysWorked++;
          }
        }
      }
      // Cas spécial pour un employé
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

  return (
    <div className="space-y-6">
      {/* Header harmonisé */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <LayoutTemplate className="h-8 w-8 text-blue-600" />
            Extraction
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Extraction des heures et statistiques</p>
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
            <Button variant="default">
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
        </div>
      </div>
      {/* Contenu principal dans un conteneur harmonisé */}
      <div className="rounded-lg border bg-background p-6">
        <div className="flex gap-4 mb-6 items-end">
          <div>
            <label className="block mb-1 text-sm font-medium">Début</label>
            <DatePickerDemo value={start} onChange={setStart} className="w-36" />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">Fin</label>
            <DatePickerDemo value={end} onChange={setEnd} className="w-36" />
          </div>
          <Button onClick={handleExtract} disabled={!start || !end || loading}>
            {loading ? "Chargement..." : "Extraire"}
          </Button>
        </div>
        <div className="rounded-lg border bg-background overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employé</TableHead>
                <TableHead>Heures nuit</TableHead>
                <TableHead>Heures nuits + férié</TableHead>
                <TableHead>Heures fériés / dimanche</TableHead>
                <TableHead>Congés</TableHead>
                <TableHead>Maladie</TableHead>
                <TableHead>TR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    Aucune donnée à afficher
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.employee.id}>
                    <TableCell>{row.employee.name}</TableCell>
                    <TableCell>{row.nightHours}</TableCell>
                    <TableCell>{row.nightAndHoliday}</TableCell>
                    <TableCell>{row.holidayAndSunday}</TableCell>
                    <TableCell>{row.vacationDays}</TableCell>
                    <TableCell>{row.sickDays}</TableCell>
                    <TableCell>{row.trCount}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}