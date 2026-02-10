'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Trash2, Clock, Calendar, AlertCircle, Coffee, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Employee } from '@/lib/db/schema/employees';
import type { TimeSlot } from '@/lib/db/schema/schedules';
import type { PaintMode, SlotType } from './planning-toolbar';
import { formatDate } from '@/lib/db/utils';
import {
  mergeSlots,
  validateSlots,
  eraseRange,
  consolidateSlots,
  clampSlotAgainstOthers,
  clampResizeAgainstOthers,
  snapTo15,
  timeToMinutes,
  minutesToTime,
} from '@/lib/planning-slot-utils';

// ─── Slot type config ─────────────────────────────────────────

const SLOT_TYPES: { type: SlotType; label: string; icon: typeof Clock }[] = [
  { type: 'work', label: 'Travail', icon: Clock },
  { type: 'vacation', label: 'Congés', icon: Calendar },
  { type: 'sick', label: 'Maladie', icon: AlertCircle },
  { type: 'personal', label: 'Personnel', icon: Coffee },
];

// ─── Types ────────────────────────────────────────────────────

interface PlanningGridProps {
  employees: Employee[];
  daysOfWeek: string[];
  currentWeekDates: Date[];
  isHackaton: boolean;
  isEditor: boolean;
  holidays: Record<string, string>;
  activeEmployeeId: string | null;
  paintMode: PaintMode;
  slotType: SlotType;
  getEmployeeScheduleForDay: (employeeId: string, day: string) => TimeSlot[];
  getOverlappingTimeSlots: (day: string) => Array<{ employee: Employee; slot: TimeSlot; startHour: number; endHour: number }>;
  updateLocalSchedule: (employeeId: string, day: string, timeSlots: TimeSlot[], weekKey?: string) => Promise<void>;
  handleSaturdayEmployeeChange: (employeeId: string, day: string) => Promise<void>;
  onSlotDeleted: () => void;
  onDeselectEmployee?: () => void;
}

type ContextMenuState = {
  employeeId: string;
  employeeName: string;
  day: string;
  slotIndex: number;
  slot: TimeSlot;
  x: number;
  y: number;
} | null;

function getContrastYIQ(hexcolor: string): string {
  let color = hexcolor.replace('#', '');
  if (color.length === 3) color = color.split('').map((x) => x + x).join('');
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#222' : '#fff';
}

type StackedSlot = {
  employee: Employee;
  slot: TimeSlot;
  startHour: number;
  endHour: number;
  slotColumn: number;
  clusterColumns: number;
};

function getStackedSlots(daySlots: Omit<StackedSlot, 'slotColumn' | 'clusterColumns'>[]) {
  const sorted = [...daySlots].sort((a, b) => a.startHour - b.startHour || a.endHour - b.endHour);
  if (sorted.length === 0) return [];

  const clusters: number[][] = [];
  let currentCluster = [0];
  let clusterEnd = sorted[0].endHour;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startHour < clusterEnd) {
      currentCluster.push(i);
      clusterEnd = Math.max(clusterEnd, sorted[i].endHour);
    } else {
      clusters.push(currentCluster);
      currentCluster = [i];
      clusterEnd = sorted[i].endHour;
    }
  }
  clusters.push(currentCluster);

  const slotColumns = new Array<number>(sorted.length).fill(0);
  const clusterCols = new Array<number>(sorted.length).fill(1);

  for (const clusterIndices of clusters) {
    const columns: number[][] = [];
    for (const idx of clusterIndices) {
      let placed = false;
      for (let col = 0; col < columns.length; col++) {
        const lastIdx = columns[col][columns[col].length - 1];
        if (sorted[lastIdx].endHour <= sorted[idx].startHour) {
          columns[col].push(idx);
          slotColumns[idx] = col;
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([idx]);
        slotColumns[idx] = columns.length - 1;
      }
    }
    const numCols = columns.length;
    for (const idx of clusterIndices) {
      clusterCols[idx] = numCols;
    }
  }

  return sorted.map((s, i) => ({ ...s, slotColumn: slotColumns[i], clusterColumns: clusterCols[i] }));
}

// ─── Component ────────────────────────────────────────────────

export function PlanningGrid({
  employees,
  daysOfWeek,
  currentWeekDates,
  isHackaton,
  isEditor,
  holidays,
  activeEmployeeId,
  paintMode,
  slotType,
  getEmployeeScheduleForDay,
  getOverlappingTimeSlots,
  updateLocalSchedule,
  handleSaturdayEmployeeChange,
  onSlotDeleted,
  onDeselectEmployee,
}: PlanningGridProps) {
  const baseHour = isHackaton ? 6 : 8;
  const totalHours = isHackaton ? 24 : 14;
  const gridStartMin = baseHour * 60;
  const gridEndMin = (baseHour + totalHours) * 60;
  const hours = useMemo(() => Array.from({ length: totalHours }, (_, i) => (baseHour + i) % 24), [baseHour, totalHours]);

  // ─── Interaction state ──────────────────────────────────────

  const [paintDrag, setPaintDrag] = useState<{ day: string; startMinutes: number; currentMinutes: number } | null>(null);
  const [dragSlot, setDragSlot] = useState<{ employeeId: string; day: string; slotIndex: number; duration: number; originalStart: string } | null>(null);
  const [dragGhostTime, setDragGhostTime] = useState<string | null>(null);
  const dragOffsetRef = useRef(0);
  const [resizeSlot, setResizeSlot] = useState<{ employeeId: string; day: string; slotIndex: number; type: 'start' | 'end' } | null>(null);
  const [resizeValue, setResizeValue] = useState<string | null>(null);
  const isInteracting = !!(paintDrag || dragSlot || resizeSlot);

  // Hover tracking — slots shrink only when the cursor overlaps them
  const [hoverDay, setHoverDay] = useState<string | null>(null);
  const [hoverMinutes, setHoverMinutes] = useState<number | null>(null);

  // Context menu
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [editingSlot, setEditingSlot] = useState<{ employeeId: string; day: string; slotIndex: number; start: string; end: string; note: string } | null>(null);

  const isPaintModeActive = (paintMode === 'paint' || paintMode === 'erase') && !!activeEmployeeId;

  // ─── Helpers ────────────────────────────────────────────────

  const getTimeSlotPosition = useCallback((startTime: string, endTime: string) => {
    let sh = parseInt(startTime.split(':')[0]) + parseInt(startTime.split(':')[1]) / 60;
    let eh = parseInt(endTime.split(':')[0]) + parseInt(endTime.split(':')[1]) / 60;
    if (isHackaton) {
      if (sh < baseHour) sh += 24;
      if (eh < baseHour) eh += 24;
      if (eh <= sh) eh += 24;
    }
    const top = ((sh - baseHour) / totalHours) * 100;
    const height = ((eh - sh) / totalHours) * 100;
    return { top: `${top}%`, height: `${height}%` };
  }, [baseHour, totalHours, isHackaton]);

  const hourToTime = useCallback((hour: number) => {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60 / 5) * 5;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }, []);

  const getMinutesFromMouseY = useCallback((day: string, clientY: number, snapMinutes: number = 15): number => {
    const grid = document.getElementById(`day-grid-${day}`);
    if (!grid) return gridStartMin;
    const rect = grid.getBoundingClientRect();
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height - 1));
    const rawMinutes = (baseHour + (y / rect.height) * totalHours) * 60;
    return Math.round(rawMinutes / snapMinutes) * snapMinutes;
  }, [baseHour, totalHours, gridStartMin]);

  // ─── Escape key ─────────────────────────────────────────────

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (contextMenu) { setContextMenu(null); setEditingSlot(null); return; }
        if (editingSlot) { setEditingSlot(null); return; }
        if (paintDrag) setPaintDrag(null);
        if (dragSlot) { setDragSlot(null); setDragGhostTime(null); }
        if (resizeSlot) { setResizeSlot(null); setResizeValue(null); }
        if (!paintDrag && !dragSlot && !resizeSlot && onDeselectEmployee) onDeselectEmployee();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [paintDrag, dragSlot, resizeSlot, onDeselectEmployee, contextMenu, editingSlot]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const onClick = () => { setContextMenu(null); setEditingSlot(null); };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [contextMenu]);

  // ─── Paint ──────────────────────────────────────────────────

  const handleCellMouseDown = useCallback((day: string, e: React.MouseEvent) => {
    if (e.button !== 0) return; // left click only
    e.preventDefault();
    if (contextMenu) { setContextMenu(null); setEditingSlot(null); return; }
    if (!isEditor || !activeEmployeeId) return;
    if (paintMode !== 'paint' && paintMode !== 'erase') return;
    const minutes = getMinutesFromMouseY(day, e.clientY, 60);
    setPaintDrag({ day, startMinutes: minutes, currentMinutes: minutes });
  }, [isEditor, paintMode, activeEmployeeId, getMinutesFromMouseY, contextMenu]);

  const handlePaintCommit = useCallback(async () => {
    if (!paintDrag || !activeEmployeeId) { setPaintDrag(null); return; }
    const { day, startMinutes, currentMinutes } = paintDrag;
    const fromMin = Math.min(startMinutes, currentMinutes);
    const toMin = Math.max(startMinutes, currentMinutes) + 60;
    const start = minutesToTime(Math.max(fromMin, gridStartMin));
    const end = minutesToTime(Math.min(toMin, gridEndMin));
    if (timeToMinutes(end) <= timeToMinutes(start)) { setPaintDrag(null); return; }
    const existingSlots = getEmployeeScheduleForDay(activeEmployeeId, day);
    if (paintMode === 'erase') {
      const result = eraseRange(existingSlots, start, end);
      await updateLocalSchedule(activeEmployeeId, day, validateSlots(result, gridStartMin, gridEndMin));
    } else {
      const newSlot: TimeSlot = { start, end, isWorking: slotType === 'work', type: slotType };
      const merged = mergeSlots(existingSlots, newSlot);
      await updateLocalSchedule(activeEmployeeId, day, validateSlots(merged, gridStartMin, gridEndMin));
    }
    setPaintDrag(null);
    if (onDeselectEmployee) onDeselectEmployee();
  }, [paintDrag, activeEmployeeId, slotType, paintMode, gridStartMin, gridEndMin, getEmployeeScheduleForDay, updateLocalSchedule, onDeselectEmployee]);

  useEffect(() => {
    if (!paintDrag) return;
    const onMouseMove = (e: MouseEvent) => {
      const minutes = getMinutesFromMouseY(paintDrag.day, e.clientY, 60);
      setPaintDrag((prev) => prev ? { ...prev, currentMinutes: minutes } : null);
    };
    const onMouseUp = () => handlePaintCommit();
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { document.body.style.userSelect = ''; window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, [paintDrag, handlePaintCommit, getMinutesFromMouseY]);

  // ─── Slot drag (move) ──────────────────────────────────────

  useEffect(() => {
    if (!dragSlot) return;
    const onMouseMove = (e: MouseEvent) => {
      const grid = document.getElementById(`day-grid-${dragSlot.day}`);
      if (!grid) return;
      const rect = grid.getBoundingClientRect();
      let y = e.clientY - rect.top - dragOffsetRef.current;
      y = Math.max(0, Math.min(y, rect.height - 1));
      const snapped = snapTo15((baseHour + (y / rect.height) * totalHours) * 60);
      const slots = getEmployeeScheduleForDay(dragSlot.employeeId, dragSlot.day);
      const clamped = clampSlotAgainstOthers(slots, dragSlot.slotIndex, snapped, snapped + dragSlot.duration, gridStartMin, gridEndMin);
      setDragGhostTime(minutesToTime(clamped.start));
    };
    const onMouseUp = async () => {
      if (dragSlot && dragGhostTime && dragGhostTime !== dragSlot.originalStart) {
        const { employeeId, day, slotIndex, duration } = dragSlot;
        const slots = getEmployeeScheduleForDay(employeeId, day);
        const slot = slots[slotIndex];
        if (slot) {
          const clamped = clampSlotAgainstOthers(slots, slotIndex, timeToMinutes(dragGhostTime), timeToMinutes(dragGhostTime) + duration, gridStartMin, gridEndMin);
          const newSlots = slots.map((s, i) => i === slotIndex ? { ...s, start: minutesToTime(clamped.start), end: minutesToTime(clamped.end) } : s);
          await updateLocalSchedule(employeeId, day, validateSlots(consolidateSlots(newSlots), gridStartMin, gridEndMin));
        }
      }
      setDragSlot(null);
      setDragGhostTime(null);
    };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { document.body.style.userSelect = ''; document.body.style.cursor = ''; window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, [dragSlot, dragGhostTime, baseHour, totalHours, gridStartMin, gridEndMin, getEmployeeScheduleForDay, updateLocalSchedule]);

  // ─── Resize ────────────────────────────────────────────────

  useEffect(() => {
    if (!resizeSlot) return;
    const onMouseMove = (e: MouseEvent) => {
      const grid = document.getElementById(`day-grid-${resizeSlot.day}`);
      if (!grid) return;
      const rect = grid.getBoundingClientRect();
      const snapped = snapTo15((baseHour + ((e.clientY - rect.top) / rect.height) * totalHours) * 60);
      const slots = getEmployeeScheduleForDay(resizeSlot.employeeId, resizeSlot.day);
      setResizeValue(minutesToTime(clampResizeAgainstOthers(slots, resizeSlot.slotIndex, resizeSlot.type, snapped, gridStartMin, gridEndMin)));
    };
    const onMouseUp = async () => {
      if (resizeSlot && resizeValue) {
        const { employeeId, day, slotIndex, type } = resizeSlot;
        const slots = getEmployeeScheduleForDay(employeeId, day);
        const slot = slots[slotIndex];
        if (slot) {
          let newStart = slot.start, newEnd = slot.end;
          if (type === 'start' && resizeValue < slot.end) newStart = resizeValue;
          if (type === 'end' && resizeValue > slot.start) newEnd = resizeValue;
          if (newStart !== slot.start || newEnd !== slot.end) {
            const newSlots = slots.map((s, i) => (i === slotIndex ? { ...s, start: newStart, end: newEnd } : s));
            await updateLocalSchedule(employeeId, day, validateSlots(consolidateSlots(newSlots), gridStartMin, gridEndMin));
          }
        }
      }
      setResizeSlot(null);
      setResizeValue(null);
    };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ns-resize';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { document.body.style.userSelect = ''; document.body.style.cursor = ''; window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, [resizeSlot, resizeValue, baseHour, totalHours, gridStartMin, gridEndMin, getEmployeeScheduleForDay, updateLocalSchedule]);

  // ─── Delete ────────────────────────────────────────────────

  const handleSlotDelete = useCallback(async (employeeId: string, day: string, slotIndex: number) => {
    const slots = getEmployeeScheduleForDay(employeeId, day);
    const newSlots = [...slots];
    newSlots.splice(slotIndex, 1);
    await updateLocalSchedule(employeeId, day, newSlots);
    onSlotDeleted();
  }, [getEmployeeScheduleForDay, updateLocalSchedule, onSlotDeleted]);

  // ─── Context menu actions ──────────────────────────────────

  const handleChangeSlotType = useCallback(async (newType: SlotType) => {
    if (!contextMenu) return;
    const { employeeId, day, slotIndex } = contextMenu;
    const slots = getEmployeeScheduleForDay(employeeId, day);
    const slot = slots[slotIndex];
    if (!slot || slot.type === newType) { setContextMenu(null); return; }
    const newSlots = slots.map((s, i) => i === slotIndex ? { ...s, type: newType, isWorking: newType === 'work' } : s);
    await updateLocalSchedule(employeeId, day, validateSlots(consolidateSlots(newSlots), gridStartMin, gridEndMin));
    setContextMenu(null);
  }, [contextMenu, getEmployeeScheduleForDay, updateLocalSchedule, gridStartMin, gridEndMin]);

  const handleSaveEdit = useCallback(async () => {
    if (!editingSlot) return;
    const { employeeId, day, slotIndex, start, end, note } = editingSlot;
    const slots = getEmployeeScheduleForDay(employeeId, day);
    const slot = slots[slotIndex];
    if (!slot) { setEditingSlot(null); setContextMenu(null); return; }
    if (timeToMinutes(end) <= timeToMinutes(start)) { setEditingSlot(null); setContextMenu(null); return; }
    const newSlots = slots.map((s, i) => i === slotIndex ? { ...s, start, end, note: note || undefined } : s);
    await updateLocalSchedule(employeeId, day, validateSlots(consolidateSlots(newSlots), gridStartMin, gridEndMin));
    setEditingSlot(null);
    setContextMenu(null);
  }, [editingSlot, getEmployeeScheduleForDay, updateLocalSchedule, gridStartMin, gridEndMin]);

  // ─── Paint preview ─────────────────────────────────────────

  const paintRange = paintDrag ? {
    day: paintDrag.day,
    fromMin: Math.min(paintDrag.startMinutes, paintDrag.currentMinutes),
    toMin: Math.max(paintDrag.startMinutes, paintDrag.currentMinutes) + 60,
  } : null;

  const activeEmployee = employees.find((e) => e.id === activeEmployeeId);

  return (
    <div className="flex-1 flex flex-col min-h-0 rounded-lg border bg-background overflow-hidden">
      <div className="flex-1 flex min-h-0">
        {/* Hour labels */}
        <div className="w-10 flex-shrink-0 border-r flex flex-col">
          <div className="h-14 border-b flex-shrink-0" />
          <div className="flex-1 flex flex-col">
            {hours.map((hour) => (
              <div key={hour} className="flex-1 flex items-start justify-end pr-1.5 text-[10px] text-muted-foreground font-medium border-b border-border/30" style={{ minHeight: 0 }}>
                {hour}h
              </div>
            ))}
          </div>
        </div>

        {/* Day columns */}
        <div className="flex-1 grid min-h-0" style={{ gridTemplateColumns: `repeat(${daysOfWeek.length}, minmax(0, 1fr))` }}>
          {daysOfWeek.map((day, dayIndex) => {
            const dateStr = currentWeekDates[dayIndex].toISOString().slice(0, 10);
            const holidayName = holidays[dateStr];
            const isWeekend = day === 'samedi' || day === 'dimanche';
            const weekendWorker = isWeekend ? employees.find((emp) => { const slots = getEmployeeScheduleForDay(emp.id, day); return slots?.length > 0 && slots.some((s) => s.type === 'work'); }) : null;
            const daySlots = getOverlappingTimeSlots(day);
            const stacked = getStackedSlots(daySlots);

            // Should a slot in this column shrink? Only when pencil hovers over its time range
            const shouldSlotShrink = (slotStart: number, slotEnd: number) =>
              isPaintModeActive && hoverDay === day && hoverMinutes !== null &&
              hoverMinutes < slotEnd && (hoverMinutes + 60) > slotStart;

            return (
              <div key={day} className="flex flex-col min-h-0 border-r last:border-r-0">
                {/* Day header */}
                <div className={cn('h-14 border-b flex flex-col items-center justify-center px-1 flex-shrink-0', holidayName && 'bg-red-50 dark:bg-red-950/30')}>
                  <div className="text-xs font-bold capitalize">{day}</div>
                  <div className="text-[10px] text-muted-foreground">{formatDate(currentWeekDates[dayIndex])}</div>
                  {holidayName && <div className="text-[9px] text-red-600 dark:text-red-400 font-medium truncate max-w-full">{holidayName}</div>}
                  {isWeekend && isEditor && (
                    <Select value={weekendWorker?.id ?? 'none'} onValueChange={(empId) => handleSaturdayEmployeeChange(empId === 'none' ? '' : empId, day)}>
                      <SelectTrigger className="h-5 text-[10px] w-full max-w-[100px] px-1 border-0 bg-transparent"><SelectValue placeholder="Personne" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun</SelectItem>
                        {employees.map((emp) => (<SelectItem key={emp.id} value={emp.id}><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: emp.color }} />{emp.name}</div></SelectItem>))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Day grid */}
                <div
                  className="flex-1 relative flex flex-col"
                  id={`day-grid-${day}`}
                  style={{ cursor: isPaintModeActive ? 'crosshair' : undefined }}
                  onMouseDown={(e) => handleCellMouseDown(day, e)}
                  onMouseEnter={() => { if (isPaintModeActive) setHoverDay(day); }}
                  onMouseLeave={() => { if (hoverDay === day) { setHoverDay(null); setHoverMinutes(null); } }}
                  onMouseMove={(e) => { if (isPaintModeActive && !isInteracting) { setHoverDay(day); setHoverMinutes(getMinutesFromMouseY(day, e.clientY, 60)); } }}
                >
                  {/* Hour cells */}
                  {hours.map((hour) => {
                    const cellStartMin = hour * 60;
                    const cellEndMin = (hour + 1) * 60;
                    const adjustedCellStart = isHackaton && hour < baseHour ? cellStartMin + 24 * 60 : cellStartMin;
                    const adjustedCellEnd = isHackaton && hour < baseHour ? cellEndMin + 24 * 60 : cellEndMin;
                    const isPaintPreview = paintRange && paintRange.day === day && adjustedCellStart < paintRange.toMin && adjustedCellEnd > paintRange.fromMin;

                    return (
                      <div
                        key={hour}
                        className={cn(
                          'flex-1 border-b border-border/30',
                          isPaintModeActive && !isInteracting && 'hover:bg-muted/40',
                          isPaintModeActive && paintMode === 'erase' && !isInteracting && 'hover:bg-red-50 dark:hover:bg-red-950/20',
                          holidayName && 'bg-red-50/30 dark:bg-red-950/10'
                        )}
                        style={isPaintPreview && activeEmployee ? { backgroundColor: paintMode === 'erase' ? '#ef444420' : `${activeEmployee.color}30` } : undefined}
                      />
                    );
                  })}

                  {/* Rendered slots */}
                  {stacked.map(({ employee, slot, slotColumn, clusterColumns }, index) => {
                    if ((day === 'samedi' || day === 'dimanche') && slot.type === 'vacation') return null;

                    const isWork = slot.type === 'work';
                    const { top, height } = getTimeSlotPosition(
                      isWork ? slot.start : hourToTime(baseHour),
                      isWork ? slot.end : hourToTime(baseHour + totalHours)
                    );

                    const absenceBg = 'repeating-linear-gradient(135deg, #cbd5e1 0px, #cbd5e1 10px, #f1f5f9 10px, #f1f5f9 20px)';
                    const bgColor = employee.color || '#8884d8';
                    const textColor = getContrastYIQ(bgColor);

                    // Only shrink when pencil cursor overlaps this slot's time range
                    const slotStartMin = timeToMinutes(slot.start);
                    const slotEndMin = timeToMinutes(slot.end);
                    const shrink = shouldSlotShrink(slotStartMin, slotEndMin);
                    const shrinkFactor = shrink ? 0.55 : 1;
                    const colWidth = 100 / clusterColumns;
                    const gap = 2;
                    const width = `calc(${colWidth * shrinkFactor}% - ${gap * 2}px)`;
                    const leftPos = `calc(${slotColumn * colWidth * shrinkFactor}% + ${gap}px)`;

                    const slotIndex = getEmployeeScheduleForDay(employee.id, day).findIndex(
                      (s) => s.start === slot.start && s.end === slot.end && s.type === slot.type
                    );

                    let displayStart = slot.start;
                    let displayEnd = slot.end;
                    if (resizeSlot?.employeeId === employee.id && resizeSlot.day === day && resizeSlot.slotIndex === slotIndex) {
                      if (resizeSlot.type === 'start' && resizeValue && resizeValue < slot.end) displayStart = resizeValue;
                      if (resizeSlot.type === 'end' && resizeValue && resizeValue > slot.start) displayEnd = resizeValue;
                    }

                    const isDragging = dragSlot?.employeeId === employee.id && dragSlot.day === day && dragSlot.slotIndex === slotIndex;

                    const slotPointerEvents = (() => {
                      if (isInteracting) return 'none' as const;
                      if (!isWork && !isPaintModeActive) return 'none' as const;
                      return undefined;
                    })();

                    return (
                      <div
                        key={`${employee.id}-${slot.start}-${slot.end}-${index}`}
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
                        className={cn(
                          'absolute rounded-md shadow-sm overflow-hidden group',
                          isDragging && 'ring-2 ring-green-400/60 shadow-xl opacity-90',
                          resizeSlot?.employeeId === employee.id && resizeSlot.day === day && resizeSlot.slotIndex === slotIndex && 'ring-2 ring-blue-400/60 shadow-xl'
                        )}
                        style={{
                          top: isDragging && dragGhostTime
                            ? `${((parseInt(dragGhostTime.split(':')[0]) + parseInt(dragGhostTime.split(':')[1]) / 60 - baseHour) / totalHours) * 100}%`
                            : top,
                          height: `calc(${height} - 2px)`,
                          width,
                          left: leftPos,
                          zIndex: slotColumn + 1,
                          background: isWork ? bgColor : absenceBg,
                          color: isWork ? textColor : '#64748b',
                          border: isWork ? `2px solid ${bgColor}` : '2px solid #64748b',
                          opacity: shrink ? 0.5 : (isWork ? 1 : 0.85),
                          transition: isInteracting ? 'none' : 'width 200ms ease, left 200ms ease, opacity 200ms ease',
                          cursor: paintMode === 'erase' ? 'pointer' : (isWork ? 'grab' : 'default'),
                          userSelect: 'none',
                          pointerEvents: slotPointerEvents,
                        }}
                        title={isWork ? `${employee.name}: ${displayStart}-${displayEnd}` : `${employee.name} — ${slot.type}`}
                        onClick={() => { if (paintMode === 'erase' && isEditor) handleSlotDelete(employee.id, day, slotIndex); }}
                        onContextMenu={(e) => {
                          if (!isEditor) return;
                          e.preventDefault();
                          e.stopPropagation();
                          setContextMenu({ employeeId: employee.id, employeeName: employee.name, day, slotIndex, slot, x: e.clientX, y: e.clientY });
                          setEditingSlot(null);
                        }}
                        onMouseDown={(e) => {
                          if (e.button !== 0) return; // left click only
                          e.preventDefault();
                          if (!isEditor || !isWork) return;
                          if (paintMode === 'erase') return;
                          if (paintMode === 'paint' && activeEmployeeId) return;
                          if ((e.target as HTMLElement).dataset.action) return;
                          e.stopPropagation();
                          dragOffsetRef.current = e.clientY - e.currentTarget.getBoundingClientRect().top;
                          const duration = timeToMinutes(slot.end) - timeToMinutes(slot.start);
                          setDragSlot({ employeeId: employee.id, day, slotIndex, duration, originalStart: slot.start });
                          setDragGhostTime(slot.start);
                        }}
                      >
                        {/* Resize handles */}
                        {isWork && isEditor && !isPaintModeActive && (
                          <div data-action="resize" className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize z-10" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setResizeSlot({ employeeId: employee.id, day, slotIndex, type: 'start' }); setResizeValue(slot.start); }} />
                        )}

                        {/* Content */}
                        <div className="flex flex-col items-center pt-0.5 px-0.5 w-full min-h-0">
                          <span className="text-[10px] font-bold leading-tight truncate w-full text-center">{employee.initial}</span>
                          {isWork && (
                            <span className="text-[8px] opacity-75 leading-tight truncate w-full text-center whitespace-nowrap">
                              {displayStart.replace(':00', 'h')}-{displayEnd.replace(':00', 'h')}
                            </span>
                          )}
                        </div>

                        {isWork && isEditor && !isPaintModeActive && (
                          <div data-action="resize" className="absolute bottom-0 left-0 right-0 h-1.5 cursor-ns-resize z-10" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setResizeSlot({ employeeId: employee.id, day, slotIndex, type: 'end' }); setResizeValue(slot.end); }} />
                        )}

                        {/* Delete button */}
                        {isEditor && !isPaintModeActive && (
                          <button type="button" data-action="delete" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleSlotDelete(employee.id, day, slotIndex); }} className="absolute top-0.5 right-0.5 hidden group-hover:flex items-center justify-center w-4 h-4 rounded-full bg-white/80 dark:bg-black/40 hover:bg-red-100 dark:hover:bg-red-900/50 z-50 shadow-sm">
                            <Trash2 className="h-2.5 w-2.5 text-red-600" />
                          </button>
                        )}

                        {/* Drag preview */}
                        {isDragging && dragGhostTime && (() => {
                          const ghostEnd = timeToMinutes(dragGhostTime) + dragSlot.duration;
                          return (<div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap shadow z-50 pointer-events-none">{dragGhostTime} - {minutesToTime(ghostEnd)}</div>);
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Context menu (right-click) ──────────────────────── */}
      {contextMenu && !editingSlot && (
        <div
          className="fixed z-[100] min-w-[180px] rounded-lg border bg-popover shadow-xl py-1 text-sm animate-in fade-in-0 zoom-in-95"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[11px] text-muted-foreground font-medium border-b mb-1">
            {contextMenu.employeeName} — {contextMenu.slot.start.replace(':00', 'h')}-{contextMenu.slot.end.replace(':00', 'h')}
          </div>

          {/* Edit */}
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent text-left"
            onClick={() => setEditingSlot({ employeeId: contextMenu.employeeId, day: contextMenu.day, slotIndex: contextMenu.slotIndex, start: contextMenu.slot.start, end: contextMenu.slot.end, note: (contextMenu.slot as TimeSlot & { note?: string }).note || '' })}
          >
            <Pencil className="h-3.5 w-3.5" />
            Modifier les horaires
          </button>

          {/* Change type */}
          <div className="border-t my-1" />
          <div className="px-3 py-1 text-[11px] text-muted-foreground font-medium">Type de créneau</div>
          {SLOT_TYPES.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              type="button"
              className={cn('w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent text-left', contextMenu.slot.type === type && 'bg-accent font-semibold')}
              onClick={() => handleChangeSlotType(type)}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {contextMenu.slot.type === type && <span className="ml-auto text-[10px] text-muted-foreground">actuel</span>}
            </button>
          ))}

          {/* Delete */}
          <div className="border-t my-1" />
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 text-left"
            onClick={() => { handleSlotDelete(contextMenu.employeeId, contextMenu.day, contextMenu.slotIndex); setContextMenu(null); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Supprimer
          </button>
        </div>
      )}

      {/* ─── Edit slot form (inline from context menu) ──────── */}
      {contextMenu && editingSlot && (
        <div
          className="fixed z-[100] min-w-[220px] rounded-lg border bg-popover shadow-xl p-3 text-sm animate-in fade-in-0 zoom-in-95"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="text-xs font-semibold mb-2">Modifier le créneau</div>
          <div className="flex gap-2 mb-2">
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground">Début</label>
              <input
                type="time"
                className="w-full border rounded px-2 py-1 text-xs bg-background"
                value={editingSlot.start}
                onChange={(e) => setEditingSlot({ ...editingSlot, start: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground">Fin</label>
              <input
                type="time"
                className="w-full border rounded px-2 py-1 text-xs bg-background"
                value={editingSlot.end}
                onChange={(e) => setEditingSlot({ ...editingSlot, end: e.target.value })}
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-[10px] text-muted-foreground">Note</label>
            <input
              type="text"
              className="w-full border rounded px-2 py-1 text-xs bg-background"
              placeholder="Optionnel..."
              value={editingSlot.note}
              onChange={(e) => setEditingSlot({ ...editingSlot, note: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <button type="button" className="flex-1 bg-primary text-primary-foreground rounded px-3 py-1 text-xs font-medium hover:opacity-90" onClick={handleSaveEdit}>Sauvegarder</button>
            <button type="button" className="flex-1 border rounded px-3 py-1 text-xs hover:bg-accent" onClick={() => { setEditingSlot(null); setContextMenu(null); }}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}
