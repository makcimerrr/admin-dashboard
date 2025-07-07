import { NextRequest, NextResponse } from 'next/server';
import { deleteSchedule, upsertSchedule, getSchedule } from '@/lib/db/services/schedules';
import { getWeekNumber } from '@/lib/db/utils';
import { addHistoryEntry } from '@/lib/db/services/history';

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
    const userId = req.headers.get('x-user-id') || 'unknown';
    const userEmail = req.headers.get('x-user-email') || 'unknown';
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
      // Récupérer l'ancien planning pour audit
      const oldSchedule = await getSchedule(employeeId, weekKey, day);
      // Supprime le planning existant
      await deleteSchedule(employeeId, weekKey, day);
      if (oldSchedule) {
        await addHistoryEntry({
          type: 'absence',
          action: 'delete',
          userId,
          userEmail,
          entityId: oldSchedule.id,
          details: { before: oldSchedule },
        });
      }
      // Crée le slot d'absence
      const newSchedule = await upsertSchedule({
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
      await addHistoryEntry({
        type: 'absence',
        action: 'create',
        userId,
        userEmail,
        entityId: newSchedule.id,
        details: { payload: newSchedule },
      });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
} 