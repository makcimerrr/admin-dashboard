"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { getWeekNumber, formatDate } from "@/lib/db/utils"

interface WeekSelectorProps {
  currentWeekOffset: number
  setCurrentWeekOffset: (offset: number) => void
  currentWeekDates: Date[]
  weekNumber: number
}

export function WeekSelector({
  currentWeekOffset,
  setCurrentWeekOffset,
  currentWeekDates,
  weekNumber
}: WeekSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCurrentWeekOffset(currentWeekOffset - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <div className="text-sm font-medium px-4 py-2 bg-muted rounded">
        Semaine {weekNumber} ({formatDate(currentWeekDates[0])} - {formatDate(currentWeekDates[6])})
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCurrentWeekOffset(currentWeekOffset + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}