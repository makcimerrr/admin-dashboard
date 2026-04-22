'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, Coffee } from 'lucide-react';
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

// Hour range displayed on the timeline
const START_HOUR = 8;
const END_HOUR = 22;
const HOUR_COUNT = END_HOUR - START_HOUR;

function isToday(date: Date): boolean {
  const now = new Date();
  return date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
}

function timeToHours(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h + m / 60;
}

function computeDayHours(slots: TimeSlot[]): number {
  return slots.reduce((total, slot) => {
    if (slot.type !== 'work') return total;
    return total + (timeToHours(slot.end) - timeToHours(slot.start));
  }, 0);
}

/** Convert hour (e.g. 13.5) to percentage position on the timeline */
function hourToPct(h: number): number {
  const clamped = Math.max(START_HOUR, Math.min(END_HOUR, h));
  return ((clamped - START_HOUR) / HOUR_COUNT) * 100;
}

export function MobileDayView({
  employees,
  daysOfWeek,
  currentWeekDates,
  getEmployeeScheduleForDay,
  slotTypeConfig,
}: MobileDayViewProps) {
  const defaultDay = useMemo(() => {
    const todayIdx = currentWeekDates.findIndex(isToday);
    return todayIdx >= 0 ? todayIdx : 0;
  }, [currentWeekDates]);

  const [dayIdx, setDayIdx] = useState(defaultDay);

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
  const SWIPE_THRESHOLD = 60;

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

  // Preserve the global employee order (sorted at load time). Do not
  // re-order by who works today so the list stays the same across days.
  const sortedEmployees = employees;

  const activeCount = employees.filter((e) =>
    getEmployeeScheduleForDay(e.id, day).some((s) => s.type === 'work')
  ).length;

  const today = isToday(date);

  // Hour markers every 2 hours
  const hourMarkers = Array.from({ length: HOUR_COUNT / 2 + 1 }, (_, i) => START_HOUR + i * 2);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Day navigator */}
      <div className="flex-shrink-0 flex items-center justify-between gap-1 px-2 py-2 border-b bg-background">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={goPrev} disabled={dayIdx === 0}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

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
        <span className="text-[10px] text-muted-foreground">{activeCount} actif(s)</span>
      </div>

      {/* Hour ruler (sticky) */}
      <div className="flex-shrink-0 flex border-b bg-background">
        <div className="w-20 shrink-0 border-r" />
        <div className="flex-1 relative h-6">
          {hourMarkers.map((h) => (
            <div
              key={h}
              className="absolute top-0 bottom-0 flex items-center"
              style={{ left: `${hourToPct(h)}%`, transform: 'translateX(-50%)' }}
            >
              <span className="text-[9px] text-muted-foreground tabular-nums">{h}h</span>
            </div>
          ))}
        </div>
      </div>

      {/* Employee timelines */}
      <ScrollArea className="flex-1 min-h-0">
        <div
          className="divide-y"
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
              const initials = emp.name.split(' ').map((n) => n[0]).join('').slice(0, 2);

              return (
                <div key={emp.id} className="flex items-center">
                  {/* Name column */}
                  <div className="w-20 shrink-0 px-2 py-2 border-r flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div
                        className="h-4 w-4 rounded-full shrink-0 flex items-center justify-center text-[8px] font-bold text-white"
                        style={{ backgroundColor: color }}
                      >
                        {initials}
                      </div>
                      <span className="text-[11px] font-semibold truncate">{emp.name.split(' ')[0]}</span>
                    </div>
                    {hours > 0 ? (
                      <span className="text-[9px] text-muted-foreground tabular-nums pl-5">{hours}h</span>
                    ) : (
                      <span className="text-[9px] text-muted-foreground/60 pl-5 flex items-center gap-0.5">
                        <Coffee className="h-2.5 w-2.5" />
                        Repos
                      </span>
                    )}
                  </div>

                  {/* Timeline column */}
                  <div className="flex-1 relative h-11">
                    {/* Hour grid lines (every 2h) */}
                    {hourMarkers.map((h) => (
                      <div
                        key={h}
                        className="absolute top-0 bottom-0 border-l border-border/30"
                        style={{ left: `${hourToPct(h)}%` }}
                      />
                    ))}

                    {/* Slot bars */}
                    {filtered.map((slot, idx) => {
                      const startH = timeToHours(slot.start);
                      const endH = timeToHours(slot.end);
                      const left = hourToPct(startH);
                      const width = hourToPct(endH) - left;
                      const isWork = slot.type === 'work';
                      const config = slotTypeConfig[slot.type];

                      return (
                        <div
                          key={idx}
                          className={cn(
                            'absolute top-1.5 bottom-1.5 rounded flex items-center justify-center px-1 text-[9px] font-semibold overflow-hidden border',
                            !isWork && config?.bgColor,
                            !isWork && config?.textColor,
                            !isWork && config?.borderColor,
                          )}
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                            ...(isWork ? {
                              backgroundColor: `${color}E6`,
                              borderColor: color,
                              color: '#fff',
                            } : {}),
                          }}
                          title={`${isWork ? 'Travail' : config?.label ?? slot.type} ${slot.start}–${slot.end}`}
                        >
                          <span className="truncate">{slot.start}–{slot.end}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
