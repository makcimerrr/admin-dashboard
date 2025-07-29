
import { Employee } from "@/lib/db/schema/employees"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface EmployeeRowProps {
  employee: Employee
  isSticky?: boolean
}

export function EmployeeRow({ employee, isSticky = false }: EmployeeRowProps) {
  return (
    <div className={`flex items-center gap-2 p-3 ${isSticky ? 'sticky left-0 bg-background z-10' : ''}`}>
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-xs">
          {employee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{employee.name}</div>
        <div className="text-xs text-muted-foreground">
          {employee.role || 'Employé'}
        </div>
      </div>
      {employee.hoursPerWeek && (
        <Badge variant="outline" className="text-xs">
          {employee.hoursPerWeek}h/sem
        </Badge>
      )}
    </div>
  )
}
