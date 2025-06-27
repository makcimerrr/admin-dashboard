import { NextRequest, NextResponse } from 'next/server';
import { deleteSchedule, upsertSchedule } from '@/lib/db/services/schedules';
import { getWeekNumber } from '@/lib/db/utils';

const daysOfWeek = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

function getWeekKeyFromDate(date: Date): string {
  return `${date.getFullYear()}-W${getWeekNumber(date)}`;
}

function getDayNameFromDate(date: Date): string {
  // 0 = dimanche, 1 = lundi, ...
  const idx = date.getDay() === 0 ? 6 : date.getDay() - 1;
  return daysOfWeek[idx];
}

export async function POST(req: NextRequest) {
  try {
    const { employeeId, startDate, endDate, slotType } = await req.json();
    if (!employeeId || !startDate || !endDate || !slotType) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return NextResponse.json({ error: 'La date de fin doit être après la date de début' }, { status: 400 });
    }
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const weekKey = getWeekKeyFromDate(currentDate);
      const day = getDayNameFromDate(currentDate);
      // Supprime le planning existant
      await deleteSchedule(employeeId, weekKey, day);
      // Crée le slot d'absence
      await upsertSchedule({
        employeeId,
        weekKey,
        day,
        timeSlots: [{
          start: '00:00',
          end: '23:59',
          isWorking: false,
          type: slotType,
        }],
      });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
} 