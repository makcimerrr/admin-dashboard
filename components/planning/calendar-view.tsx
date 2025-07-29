"use client"

import { useState, useRef, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge" 
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Clock, Plus, Trash2, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { EMPLOYEE_COLORS } from "@/lib/db/utils"
import type { Employee } from "@/lib/db/schema/employees"
import type { TimeSlot } from "@/lib/db/schema/schedules"

interface CalendarViewProps {
  employees: Employee[]
  currentWeekDates: Date[]
  daysOfWeek: string[]
  getEmployeeScheduleForDay: (employeeId: string, day: string) => TimeSlot[]
  updateSchedule: (employeeId: string, day: string, timeSlots: TimeSlot[]) => void
  className?: string
}

interface DraggedSlot {
  type: TimeSlot["type"]
  duration: number
  label: string
}

const PRESET_SLOTS: DraggedSlot[] = [
  { type: "work", duration: 8, label: "Journée complète (8h)" },
  { type: "work", duration: 4, label: "Demi-journée (4h)" },
  { type: "work", duration: 2, label: "2 heures" },
  { type: "vacation", duration: 8, label: "Congés" },
  { type: "sick", duration: 8, label: "Arrêt maladie" },
  { type: "personal", duration: 4, label: "Personnel" }
]

// Fonction pour calculer les heures d'un slot
const calculateSlotHours = (start: string, end: string): number => {
  const [startHour, startMinute] = start.split(':').map(Number)
  const [endHour, endMinute] = end.split(':').map(Number)
  
  const startTotal = startHour + startMinute / 60
  const endTotal = endHour + endMinute / 60
  
  return endTotal - startTotal
}

// Fonction pour obtenir la couleur d'un employé
const getEmployeeColor = (employeeId: string, employees: Employee[]): string => {
  const index = employees.findIndex(emp => emp.id === employeeId)
  return EMPLOYEE_COLORS[index % EMPLOYEE_COLORS.length]
}

// Fonction pour générer des styles avec la couleur de l'employé
const getEmployeeSlotStyle = (employeeColor: string, slotType: TimeSlot["type"], hours: number) => {
  // Opacité basée sur le nombre d'heures (plus d'heures = plus opaque)
  const opacity = Math.min(0.3 + (hours / 8) * 0.4, 0.8)
  
  // Convertir hex en RGB pour l'opacité
  const hex = employeeColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  
  const backgroundColor = `rgba(${r}, ${g}, ${b}, ${opacity})`
  const borderColor = employeeColor
  
  // Hauteur basée sur les heures (min 2rem, max 6rem)
  const height = Math.max(2, Math.min(6, hours * 0.75))
  
  return {
    backgroundColor,
    borderColor,
    borderWidth: '2px',
    borderStyle: 'solid' as const,
    minHeight: `${height}rem`,
    color: hours > 4 ? '#fff' : '#000' // Texte blanc pour les gros blocs
  }
}

export function CalendarView({
  employees,
  currentWeekDates,
  daysOfWeek,
  getEmployeeScheduleForDay,
  updateSchedule,
  className
}: CalendarViewProps) {
  const [draggedSlot, setDraggedSlot] = useState<DraggedSlot | null>(null)
  const [hoveredCell, setHoveredCell] = useState<string | null>(null)

  // Memoization des couleurs des employés
  const employeeColors = useMemo(() => {
    return employees.reduce((acc, emp, index) => {
      acc[emp.id] = EMPLOYEE_COLORS[index % EMPLOYEE_COLORS.length]
      return acc
    }, {} as Record<string, string>)
  }, [employees])

  const handleDragStart = useCallback((slot: DraggedSlot) => {
    setDraggedSlot(slot)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedSlot(null)
    setHoveredCell(null)
  }, [])

  const handleDrop = useCallback((employeeId: string, day: string, hour: number) => {
    if (!draggedSlot) return

    const startHour = hour
    const endHour = Math.min(hour + draggedSlot.duration, 22)

    const newSlot: TimeSlot = {
      start: `${startHour.toString().padStart(2, '0')}:00`,
      end: `${endHour.toString().padStart(2, '0')}:00`,
      isWorking: draggedSlot.type === "work",
      type: draggedSlot.type
    }

    const existingSlots = getEmployeeScheduleForDay(employeeId, day)
    const updatedSlots = [...existingSlots, newSlot]
    
    updateSchedule(employeeId, day, updatedSlots)
    setDraggedSlot(null)
    setHoveredCell(null)
  }, [draggedSlot, getEmployeeScheduleForDay, updateSchedule])

  const removeSlot = useCallback((employeeId: string, day: string, slotIndex: number) => {
    const existingSlots = getEmployeeScheduleForDay(employeeId, day)
    const updatedSlots = existingSlots.filter((_, index) => index !== slotIndex)
    updateSchedule(employeeId, day, updatedSlots)
  }, [getEmployeeScheduleForDay, updateSchedule])

  return (
    <div className={cn("flex flex-col h-full max-w-full", className)}>
      {/* Légende des employés */}
      <Card className="p-4 mb-4">
        <h3 className="text-sm font-medium mb-3">Employés</h3>
        <div className="flex flex-wrap gap-2">
          {employees.map((employee) => (
            <div
              key={employee.id}
              className="flex items-center gap-2 px-3 py-1 rounded-full border"
              style={{ borderColor: employeeColors[employee.id] }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: employeeColors[employee.id] }}
              />
              <span className="text-xs font-medium">{employee.name}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Slots prédéfinis à glisser */}
      <Card className="p-4 mb-4">
        <h3 className="text-sm font-medium mb-3">Glissez les créneaux dans le calendrier</h3>
        <div className="flex flex-wrap gap-2">
          {PRESET_SLOTS.map((slot, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="cursor-grab active:cursor-grabbing"
              draggable
              onDragStart={() => handleDragStart(slot)}
              onDragEnd={handleDragEnd}
            >
              <Clock className="h-3 w-3 mr-1" />
              {slot.label}
            </Button>
          ))}
        </div>
      </Card>

      {/* Calendrier principal */}
      <div className="flex-1 overflow-hidden">
        {/* Vue desktop */}
        <div className="hidden lg:block overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-8 gap-px bg-muted border rounded-lg overflow-hidden">
              {/* En-tête */}
              <div className="bg-background p-3 font-medium text-sm">
                Employés
              </div>
              {daysOfWeek.map((day, index) => (
                <div key={day} className="bg-background p-3 text-center">
                  <div className="text-sm font-medium capitalize">{day}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {currentWeekDates[index]?.getDate()}/{(currentWeekDates[index]?.getMonth() || 0) + 1}
                  </div>
                </div>
              ))}

              {/* Lignes des employés */}
              {employees.map((employee) => {
                const employeeColor = employeeColors[employee.id]
                
                return (
                  <div key={employee.id} className="contents">
                    {/* Colonne employé */}
                    <div className="bg-background p-3 border-r">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: employeeColor }}
                        />
                        <div className="text-sm font-medium truncate">
                          {employee.name}
                        </div>
                      </div>
                    </div>

                    {/* Cellules des jours */}
                    {daysOfWeek.map((day) => {
                      const cellId = `${employee.id}-${day}`
                      const slots = getEmployeeScheduleForDay(employee.id, day)
                      const totalHours = slots.reduce((total, slot) => 
                        total + calculateSlotHours(slot.start, slot.end), 0
                      )
                      
                      return (
                        <div
                          key={cellId}
                          className={cn(
                            "bg-background min-h-[6rem] p-2 relative border-r border-b transition-colors",
                            hoveredCell === cellId && "bg-accent/20"
                          )}
                          onDragOver={(e) => {
                            e.preventDefault()
                            setHoveredCell(cellId)
                          }}
                          onDragLeave={() => setHoveredCell(null)}
                          onDrop={(e) => {
                            e.preventDefault()
                            handleDrop(employee.id, day, 9)
                          }}
                        >
                          {slots.length === 0 ? (
                            <div className="text-xs text-muted-foreground text-center py-4 border-2 border-dashed border-muted rounded">
                              Glisser ici
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {slots.map((slot, index) => {
                                const hours = calculateSlotHours(slot.start, slot.end)
                                const style = getEmployeeSlotStyle(employeeColor, slot.type, hours)
                                
                                return (
                                  <div
                                    key={index}
                                    className="rounded-lg p-2 flex items-center justify-between group"
                                    style={style}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-medium">
                                        {slot.start}-{slot.end}
                                      </div>
                                      <div className="text-xs opacity-75">
                                        {hours.toFixed(1)}h
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => removeSlot(employee.id, day, index)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )
                              })}
                              {totalHours > 0 && (
                                <div className="text-xs font-medium text-center pt-1 border-t">
                                  Total: {totalHours.toFixed(1)}h
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Vue mobile/tablette */}
        <div className="lg:hidden space-y-4">
          {employees.map((employee) => {
            const employeeColor = employeeColors[employee.id]
            
            return (
              <Card key={employee.id} className="p-4" style={{ borderLeftColor: employeeColor, borderLeftWidth: '4px' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: employeeColor }}
                  />
                  <div className="font-medium">{employee.name}</div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {daysOfWeek.map((day, index) => {
                    const cellId = `${employee.id}-${day}`
                    const slots = getEmployeeScheduleForDay(employee.id, day)
                    const totalHours = slots.reduce((total, slot) => 
                      total + calculateSlotHours(slot.start, slot.end), 0
                    )
                    
                    return (
                      <div key={day} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium capitalize">{day}</div>
                          <div className="text-xs text-muted-foreground">
                            {currentWeekDates[index]?.getDate()}/{(currentWeekDates[index]?.getMonth() || 0) + 1}
                          </div>
                        </div>
                        
                        <div
                          className={cn(
                            "min-h-[4rem] p-2 border-2 border-dashed rounded-lg transition-colors",
                            hoveredCell === cellId ? "border-primary bg-accent/20" : "border-muted"
                          )}
                          onDragOver={(e) => {
                            e.preventDefault()
                            setHoveredCell(cellId)
                          }}
                          onDragLeave={() => setHoveredCell(null)}
                          onDrop={(e) => {
                            e.preventDefault()
                            handleDrop(employee.id, day, 9)
                          }}
                        >
                          {slots.length === 0 ? (
                            <div className="text-xs text-muted-foreground text-center py-3">
                              Glisser un créneau
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {slots.map((slot, index) => {
                                const hours = calculateSlotHours(slot.start, slot.end)
                                const style = getEmployeeSlotStyle(employeeColor, slot.type, hours)
                                
                                return (
                                  <div
                                    key={index}
                                    className="rounded p-2 flex items-center justify-between text-sm"
                                    style={style}
                                  >
                                    <div>
                                      <div className="font-medium">{slot.start}-{slot.end}</div>
                                      <div className="text-xs opacity-75">{hours.toFixed(1)}h</div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0"
                                      onClick={() => removeSlot(employee.id, day, index)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )
                              })}
                              {totalHours > 0 && (
                                <div className="text-xs font-medium text-center pt-2 border-t">
                                  Total: {totalHours.toFixed(1)}h
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}