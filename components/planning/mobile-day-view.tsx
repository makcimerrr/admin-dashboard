'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, Clock, Coffee } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Employee } from '@/lib/db/schema/employees';
import type { TimeSlot } from '@/lib/db/schema/schedules';
import { formatDate } from '@/lib/db/utils';

interface MobileDayViewProps {
  employees: Employee[];
  daysOfWeek: string[];
  currentWeekDates: Date[];
  getEmployeeScheduleForDay: (id: string, day: string) => TimeSlot[];
  slotTypeConfig: Record<string, { label: string; bgColor: string; borderColor: string; textColor: string }>;
}

function isToday(date: Date): boolean {
  const now = new Date();
  return date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
}

function computeDayHours(slots: TimeSlot[]): number {
  return slots.reduce((total, slot) => {
    if (slot.type !== 'work') return total;
    const [sh, sm] = slot.start.split(':').map(Number);
    const [eh, em] = slot.end.split(':').map(Number);
    return total + (eh * 60 + em - sh * 60 - sm) / 60;
  }, 0);
}

export function MobileDayView({
  employees,
  daysOfWeek,
  currentWeekDates,
  getEmployeeScheduleForDay,
  slotTypeConfig,
}: MobileDayViewProps) {
  // Default to today if the current week contains it, else Monday
  const defaultDay = (() => {
    const todayIdx = currentWeekDates.findIndex(isToday);
    return todayIdx >= 0 ? todayIdx : 0;
  })();

  const [dayIdx, setDayIdx] = useState(defaultDay);

  // Reset to default day when the week changes
  useEffect(() => {
    setDayIdx(defaultDay);
  }, [defaultDay]);

  const day = daysOfWeek[dayIdx];
  const date = currentWeekDates[dayIdx];

  const goPrev = () => setDayIdx((i) => Math.max(0, i - 1));
  const goNext = () => setDayIdx((i) => Math.min(daysOfWeek.length - 1, i + 1));

  // Swipe handling
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const SWIPE_THRESHOLD = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };
  const onTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const delta = touchStartX.current - touchEndX.current;
    if (delta > SWIPE_THRESHOLD) goNext();
    else if (delta < -SWIPE_THRESHOLD) goPrev();
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Sort: employees working this day first, then off
  const sortedEmployees = [...employees].sort((a, b) => {
    const aSlots = getEmployeeScheduleForDay(a.id, day);
    const bSlots = getEmployeeScheduleForDay(b.id, day);
    const aWorks = aSlots.some((s) => s.type === 'work');
    const bWorks = bSlots.some((s) => s.type === 'work');
    if (aWorks && !bWorks) return -1;
    if (!aWorks && bWorks) return 1;
    if (aSlots.length > 0 && bSlots.length === 0) return -1;
    if (aSlots.length === 0 && bSlots.length > 0) return 1;
    return a.name.localeCompare(b.name);
  });

  const today = isToday(date);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Horizontal day navigator */}
      <div className="flex-shrink-0 flex items-center justify-between gap-1 px-2 py-2 border-b bg-background">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={goPrev} disabled={dayIdx === 0}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Days pills (horizontal scroll on very small) */}
        <div className="flex-1 min-w-0 overflow-x-auto scrollbar-none">
          <div className="flex items-center justify-center gap-1 px-1">
            {daysOfWeek.map((d, i) => {
              const isActive = i === dayIdx;
              const dDate = currentWeekDates[i];
              const dIsToday = isToday(dDate);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDayIdx(i)}
                  className={cn(
                    'flex flex-col items-center justify-center shrink-0 rounded-lg px-2 py-1 text-[10px] font-medium uppercase transition-colors min-w-[40px] border',
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary'
                      : dIsToday
                        ? 'border-primary/50 text-primary'
                        : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <span>{d.slice(0, 3)}</span>
                  <span className={cn('text-sm font-bold tabular-nums', isActive ? '' : dIsToday ? 'text-primary' : 'text-foreground')}>
                    {dDate.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={goNext} disabled={dayIdx === daysOfWeek.length - 1}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day header */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold capitalize">{day}</span>
            {today && <Badge className="text-[9px] h-4 px-1.5 bg-primary">Aujourd'hui</Badge>}
          </div>
          <span className="text-[11px] text-muted-foreground">{formatDate(date)}</span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {sortedEmployees.filter((e) => getEmployeeScheduleForDay(e.id, day).some((s) => s.type === 'work')).length} actif(s)
        </span>
      </div>

      {/* Swipeable content area */}
      <ScrollArea className="flex-1 min-h-0">
        <div
          className="p-3 space-y-2"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {sortedEmployees.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Aucun employé</p>
          ) : (
            sortedEmployees.map((emp) => {
              const slots = getEmployeeScheduleForDay(emp.id, day);
              const filtered = (day === 'samedi' || day === 'dimanche') ? slots.filter((s) => s.type !== 'vacation') : slots;
              const hours = computeDayHours(filtered);
              const color = emp.color || '#8884d8';

              return (
                <div
                  key={emp.id}
                  className="rounded-lg border bg-background p-2.5 border-l-4"
                  style={{ borderLeftColor: color }}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://avatar.vercel.sh/${emp.id}.png`} alt={emp.name} />
                      <AvatarFallback className="text-[10px] font-bold" style={{ backgroundColor: `${color}22`, color }}>
                        {emp.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs leading-tight truncate">{emp.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{emp.role}</div>
                    </div>
                    {hours > 0 && (
                      <Badge variant="outline" className="text-[9px] h-5 px-1.5 font-bold" style={{ borderColor: color, color }}>
                        <Clock className="h-2.5 w-2.5 mr-0.5" />
                        {hours}h
                      </Badge>
                    )}
                  </div>

                  {filtered.length === 0 ? (
                    <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground italic">
                      <Coffee className="h-3 w-3" />
                      Repos
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {filtered.map((slot, idx) => {
                        const config = slotTypeConfig[slot.type];
                        return (
                          <span
                            key={idx}
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border',
                              config?.bgColor,
                              config?.textColor,
                              config?.borderColor,
                            )}
                          >
                            {slot.type === 'work' ? (
                              <>
                                <Clock className="h-2.5 w-2.5" />
                                {slot.start} – {slot.end}
                              </>
                            ) : (
                              config?.label
                            )}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
