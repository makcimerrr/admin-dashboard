import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDate } from '@/lib/db/utils';
import type { Employee } from '@/lib/db/schema/employees';
import type { TimeSlot } from '@/lib/db/schema/schedules';

interface TableViewProps {
  employees: Employee[];
  daysOfWeek: string[];
  currentWeekDates: Date[];
  getEmployeeScheduleForDay: (id: string, day: string) => TimeSlot[];
  getTotalHoursForWeek: (id: string) => number;
  slotTypeConfig: Record<string, { label: string; bgColor: string; borderColor: string; textColor: string }>;
}

// Table view (secondary)
export function TableView({
  employees,
  daysOfWeek,
  currentWeekDates,
  getEmployeeScheduleForDay,
  getTotalHoursForWeek,
  slotTypeConfig,
}: TableViewProps) {
  const renderCell = (employeeId: string, day: string) => {
    const slots = getEmployeeScheduleForDay(employeeId, day);
    const workSlots = slots.filter((s) => s.type === 'work');
    const otherSlots = slots.filter((s) => s.type !== 'work');
    if (workSlots.length === 0 && otherSlots.length === 0) {
      return <span className="text-[10px] italic text-muted-foreground">Repos</span>;
    }
    return (
      <div className="flex flex-col items-center gap-0.5">
        {workSlots.map((s, i) => (
          <span key={i} className="text-[10px] font-medium">{s.start}-{s.end}</span>
        ))}
        {otherSlots.map((s, i) => {
          const config = slotTypeConfig[s.type];
          return (
            <span key={`o${i}`} className={`px-1 py-0 rounded text-[9px] font-bold ${config?.bgColor} ${config?.textColor} border ${config?.borderColor}`}>
              {config?.label}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="rounded-lg border bg-background overflow-hidden">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
            <tr className="border-b">
              <th className="text-left p-2 text-[11px] uppercase tracking-wider font-medium text-muted-foreground sticky left-0 bg-muted/80 backdrop-blur-sm z-20">Employé</th>
              {daysOfWeek.map((day, i) => (
                <th key={day} className="text-center p-2 text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
                  <div>{day.slice(0, 3)}.</div>
                  <div className="text-[9px] font-normal">{formatDate(currentWeekDates[i])}</div>
                </th>
              ))}
              <th className="text-center p-2 text-[11px] uppercase tracking-wider font-medium text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id} className="border-b hover:bg-muted/30 align-middle">
                <td className="p-2 sticky left-0 bg-background z-10">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: employee.color || '#8884d8' }} />
                    <span className="font-medium text-xs">{employee.name}</span>
                  </div>
                </td>
                {daysOfWeek.map((day) => (
                  <td key={day} className="p-2 text-center">{renderCell(employee.id, day)}</td>
                ))}
                <td className="p-2 text-center font-bold text-xs" style={{ color: employee.color || '#8884d8' }}>
                  {getTotalHoursForWeek(employee.id)}h
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScrollArea>
  );
}
