'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Eraser,
  Clock,
  Calendar,
  AlertCircle,
  Coffee,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Employee } from '@/lib/db/schema/employees';
import type { TimeSlot } from '@/lib/db/schema/schedules';

export type PaintMode = 'paint' | 'erase';
export type SlotType = TimeSlot['type'];

interface PlanningToolbarProps {
  employees: Employee[];
  activeEmployeeId: string | null;
  paintMode: PaintMode;
  slotType: SlotType;
  isEditor: boolean;
  getTotalHoursForWeek: (employeeId: string) => number;
  onSelectEmployee: (employeeId: string | null) => void;
  onSetPaintMode: (mode: PaintMode) => void;
  onSetSlotType: (type: SlotType) => void;
  onOpenSidebar: () => void;
}

const slotTypeOptions: { type: SlotType; label: string; icon: typeof Clock }[] = [
  { type: 'work', label: 'Travail', icon: Clock },
  { type: 'vacation', label: 'Congés', icon: Calendar },
  { type: 'sick', label: 'Maladie', icon: AlertCircle },
  { type: 'personal', label: 'Personnel', icon: Coffee },
];

function getContrastYIQ(hexcolor: string): string {
  let color = hexcolor.replace('#', '');
  if (color.length === 3)
    color = color.split('').map((x) => x + x).join('');
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#222' : '#fff';
}

export function PlanningToolbar({
  employees,
  activeEmployeeId,
  paintMode,
  slotType,
  isEditor,
  getTotalHoursForWeek,
  onSelectEmployee,
  onSetPaintMode,
  onSetSlotType,
  onOpenSidebar,
}: PlanningToolbarProps) {
  const activeEmployee = employees.find((e) => e.id === activeEmployeeId);

  return (
    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border flex-wrap">
      {/* Crayons employés */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {employees.map((employee) => {
          const isActive = activeEmployeeId === employee.id && paintMode === 'paint';
          const hours = getTotalHoursForWeek(employee.id);

          return (
            <button
              key={employee.id}
              type="button"
              disabled={!isEditor}
              onClick={() => {
                if (activeEmployeeId === employee.id && paintMode === 'paint') {
                  onSelectEmployee(null);
                } else {
                  onSelectEmployee(employee.id);
                  onSetPaintMode('paint');
                }
              }}
              className={cn(
                'relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 transition-all duration-150 select-none',
                isActive
                  ? 'scale-105 shadow-lg ring-2 ring-offset-1'
                  : 'hover:scale-[1.02] hover:shadow-sm',
                !isEditor && 'opacity-50 cursor-not-allowed'
              )}
              style={{
                borderColor: employee.color,
                backgroundColor: isActive ? employee.color : 'transparent',
                color: isActive ? getContrastYIQ(employee.color) : undefined,
                outlineColor: isActive ? employee.color : undefined,
              }}
              title={`${employee.name} — ${hours}h cette semaine`}
            >
              <div
                className={cn(
                  'w-3 h-3 rounded-full flex-shrink-0',
                  isActive && 'ring-2 ring-white/50'
                )}
                style={{ backgroundColor: isActive ? getContrastYIQ(employee.color) : employee.color }}
              />
              <span className="text-xs font-semibold whitespace-nowrap">
                {employee.initial || employee.name.split(' ').map((n) => n[0]).join('')}
              </span>
              {isActive && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1 py-0 h-4 ml-0.5"
                  style={{
                    backgroundColor: `${getContrastYIQ(employee.color)}20`,
                    color: getContrastYIQ(employee.color),
                  }}
                >
                  {hours}h
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Separator */}
      <div className="w-px h-8 bg-border mx-1" />

      {/* Gomme */}
      <button
        type="button"
        disabled={!isEditor}
        onClick={() => {
          if (paintMode === 'erase') {
            onSetPaintMode('paint');
          } else {
            onSetPaintMode('erase');
          }
        }}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 transition-all duration-150',
          paintMode === 'erase'
            ? 'border-red-500 bg-red-500 text-white scale-105 shadow-lg'
            : 'border-border hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20',
          !isEditor && 'opacity-50 cursor-not-allowed'
        )}
        title="Mode gomme — cliquez sur un créneau pour le supprimer"
      >
        <Eraser className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">Gomme</span>
      </button>

      {/* Separator */}
      <div className="w-px h-8 bg-border mx-1" />

      {/* Type de créneau */}
      <div className="flex items-center gap-1">
        {slotTypeOptions.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            type="button"
            disabled={!isEditor}
            onClick={() => onSetSlotType(type)}
            className={cn(
              'flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all',
              slotType === type
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'hover:bg-muted text-muted-foreground',
              !isEditor && 'opacity-50 cursor-not-allowed'
            )}
            title={label}
          >
            <Icon className="h-3 w-3" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Active employee indicator */}
      {activeEmployee && paintMode === 'paint' && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div
            className="w-2.5 h-2.5 rounded-full animate-pulse"
            style={{ backgroundColor: activeEmployee.color }}
          />
          <span>
            Peinture : <strong>{activeEmployee.name}</strong> ({getTotalHoursForWeek(activeEmployee.id)}h/sem)
          </span>
        </div>
      )}
      {paintMode === 'erase' && (
        <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
          <Eraser className="h-3 w-3 animate-pulse" />
          <span>Mode gomme actif</span>
        </div>
      )}

      {/* Outils */}
      {isEditor && (
        <Button variant="outline" size="sm" onClick={onOpenSidebar}>
          <Wrench className="h-3.5 w-3.5 mr-1.5" />
          Outils
        </Button>
      )}
    </div>
  );
}
