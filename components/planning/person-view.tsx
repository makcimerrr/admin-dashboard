import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Employee } from '@/lib/db/schema/employees';
import type { TimeSlot } from '@/lib/db/schema/schedules';

interface PersonViewProps {
  employees: Employee[];
  daysOfWeek: string[];
  currentWeekDates: Date[];
  getEmployeeScheduleForDay: (id: string, day: string) => TimeSlot[];
  getTotalHoursForWeek: (id: string) => number;
  slotTypeConfig: Record<string, { label: string; bgColor: string; borderColor: string; textColor: string }>;
}

// Person view (secondary)
export function PersonView({
  employees,
  daysOfWeek,
  currentWeekDates,
  getEmployeeScheduleForDay,
  getTotalHoursForWeek,
  slotTypeConfig,
}: PersonViewProps) {
  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-1">
        {employees.map((employee) => (
          <div
            key={employee.id}
            className="rounded-xl border bg-background p-3 border-l-4"
            style={{ borderLeftColor: employee.color || '#8884d8' }}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <Avatar className="h-9 w-9 ring-2 ring-offset-1" style={{ ['--tw-ring-color' as string]: employee.color || '#8884d8' }}>
                <AvatarImage src={`https://avatar.vercel.sh/${employee.id}.png`} alt={employee.name} />
                <AvatarFallback className="text-xs font-bold">{employee.name.split(' ').map((n) => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm leading-tight">{employee.name}</div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  {employee.role}
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-bold" style={{ borderColor: employee.color || '#8884d8', color: employee.color || '#8884d8' }}>
                    {getTotalHoursForWeek(employee.id)}h
                  </Badge>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              {daysOfWeek.map((day, i) => {
                const slots = getEmployeeScheduleForDay(employee.id, day);
                const filtered = (day === 'samedi' || day === 'dimanche') ? slots.filter((s) => s.type !== 'vacation') : slots;
                return (
                  <div key={day} className="flex items-center gap-2 text-xs">
                    <span className="w-16 font-medium text-[11px] capitalize text-muted-foreground">{day}</span>
                    {filtered.length === 0 ? (
                      <span className="text-[10px] italic text-muted-foreground">Repos</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {filtered.map((slot, idx) => {
                          const config = slotTypeConfig[slot.type];
                          return (
                            <span key={idx} className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${config?.bgColor} ${config?.textColor} border ${config?.borderColor}`}>
                              {config?.label} {slot.start}-{slot.end}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
