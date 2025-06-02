"use client"

import { ChevronDownIcon, TrashIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface StudentFiltersProps {
  currentStatus?: string
  currentDelayLevel?: string
  onStatusFilter: (status: string) => void
  onDelayLevelFilter: (delayLevel: string) => void
  onClearFilters: () => void
}

export function StudentFilters({
                                 currentStatus,
                                 currentDelayLevel,
                                 onStatusFilter,
                                 onDelayLevelFilter,
                                 onClearFilters,
                               }: StudentFiltersProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Filters:</span>
        {(currentStatus || currentDelayLevel) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {currentStatus && <span>Status: {currentStatus}</span>}
            {currentStatus && currentDelayLevel && <span>•</span>}
            {currentDelayLevel && <span>Delay: {currentDelayLevel}</span>}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Status {currentStatus && `(${currentStatus})`}
              <ChevronDownIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={() => onStatusFilter("")}>All</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onStatusFilter("audit")}>Audit</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onStatusFilter("working")}>Working</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onStatusFilter("without group")}>Without Group</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Delay {currentDelayLevel && `(${currentDelayLevel})`}
              <ChevronDownIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={() => onDelayLevelFilter("")}>All</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDelayLevelFilter("bien")}>Bien</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDelayLevelFilter("en retard")}>En Retard</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDelayLevelFilter("en avance")}>En Avance</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDelayLevelFilter("spécialité")}>Spécialité</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button onClick={onClearFilters} variant="ghost" size="sm">
          <TrashIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
