
import { TimeSlot as TimeSlotType } from "@/lib/db/schema/schedules"
import { Badge } from "@/components/ui/badge"
import { Clock, Plane, AlertCircle, Coffee } from "lucide-react"

interface TimeSlotProps {
  slot: TimeSlotType
  onClick?: () => void
  className?: string
}

const slotConfig = {
  work: {
    icon: Clock,
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    textColor: "text-blue-700 dark:text-blue-400",
    badgeVariant: "default" as const
  },
  vacation: {
    icon: Plane,
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    textColor: "text-orange-700 dark:text-orange-400",
    badgeVariant: "secondary" as const
  },
  sick: {
    icon: AlertCircle,
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    textColor: "text-red-700 dark:text-red-400",
    badgeVariant: "destructive" as const
  },
  personal: {
    icon: Coffee,
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/30",
    textColor: "text-violet-700 dark:text-violet-400",
    badgeVariant: "outline" as const
  }
}

export function TimeSlot({ slot, onClick, className = "" }: TimeSlotProps) {
  const config = slotConfig[slot.type]
  const Icon = config.icon

  return (
    <div
      className={`p-2 rounded-md border cursor-pointer transition-colors hover:opacity-80 ${config.bgColor} ${config.borderColor} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-1 mb-1">
        <Icon className="h-3 w-3" />
        <Badge variant={config.badgeVariant} className="text-xs">
          {slot.type}
        </Badge>
      </div>
      <div className={`text-xs font-medium ${config.textColor}`}>
        {slot.start} - {slot.end}
      </div>
      {slot.note && (
        <div className="text-xs text-muted-foreground mt-1 truncate">
          {slot.note}
        </div>
      )}
    </div>
  )
}
