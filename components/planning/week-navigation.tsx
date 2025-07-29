
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface WeekNavigationProps {
  currentWeek: number
  onPrevious: () => void
  onNext: () => void
  onReset: () => void
  isHackathon?: boolean
}

export function WeekNavigation({
  currentWeek,
  onPrevious,
  onNext,
  onReset,
  isHackathon = false
}: WeekNavigationProps) {
  const getWeekLabel = (offset: number) => {
    if (offset === 0) return "Cette semaine"
    if (offset === 1) return "Semaine prochaine"
    if (offset === -1) return "Semaine dernière"
    return `${offset > 0 ? "+" : ""}${offset} semaines`
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onPrevious}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {getWeekLabel(currentWeek)}
        </Badge>
        <Button
          variant="outline"
          size="icon"
          onClick={onNext}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        {isHackathon && (
          <Badge variant="destructive">
            Semaine Hackathon
          </Badge>
        )}
        <Button variant="outline" size="sm" onClick={onReset}>
          Aujourd'hui
        </Button>
      </div>
    </div>
  )
}
