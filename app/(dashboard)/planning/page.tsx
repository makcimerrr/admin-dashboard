"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/hooks/use-toast"
import { Calendar as CalendarIcon, Clock, Users, PhoneCall, ChevronLeft, ChevronRight, Grid, List, Settings, Loader2, Home, Copy, Plus, Trash2, Edit } from "lucide-react"
import { Separator } from "@radix-ui/react-separator"
import Link from "next/link"
import { getWeekDates, getWeekNumber, getWeekKey, formatDate, EMPLOYEE_COLORS } from "@/lib/db/utils"
import type { Employee } from "@/lib/db/schema/employees"
import type { TimeSlot } from "@/lib/db/schema/schedules"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { CallStack } from 'next/dist/client/components/react-dev-overlay/ui/components/errors/call-stack/call-stack';

// Étendre le type Employee pour inclure les plannings
interface EmployeeWithSchedule extends Employee {
  schedule: {
    [weekKey: string]: {
      [day: string]: TimeSlot[]
    }
  }
}

// Configuration des types de créneaux
const slotTypeConfig = {
  work: {
    label: "Travail",
    icon: Clock,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-800",
  },
  vacation: {
    label: "Congés",
    icon: CalendarIcon,
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    textColor: "text-orange-800",
  },
  sick: {
    label: "Arrêt maladie",
    icon: CalendarIcon,
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-800",
  },
  personal: {
    label: "Personnel",
    icon: CalendarIcon,
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    textColor: "text-purple-800",
  },
}

const daysOfWeek = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
const hours = Array.from({ length: 15 }, (_, i) => i + 8) // 8h à 22h

// Ajout de la fonction utilitaire en dehors du composant
function getContrastYIQ(hexcolor: string): string {
  let color = hexcolor.replace('#', '');
  if (color.length === 3) color = color.split('').map((x: string) => x + x).join('');
  const r = parseInt(color.substr(0,2),16);
  const g = parseInt(color.substr(2,2),16);
  const b = parseInt(color.substr(4,2),16);
  const yiq = ((r*299)+(g*587)+(b*114))/1000;
  return (yiq >= 128) ? '#222' : '#fff';
}

// Modifier l'interface EmployeeManagementView pour utiliser des types synchrones
function EmployeeManagementView({
  employees,
  currentWeekKey,
  currentWeekDates,
  weekNumber,
  daysOfWeek,
  getTotalHoursForWeek,
  updateLocalSchedule,
  getEmployeeScheduleForDay,
  slotTypeConfig,
  currentWeekOffset,
  setCurrentWeekOffset,
  setSchedules,
  setEmployees,
  reloadSchedules,
}: {
  employees: EmployeeWithSchedule[]
  currentWeekKey: string
  currentWeekDates: Date[]
  weekNumber: number
  daysOfWeek: string[]
  getTotalHoursForWeek: (employeeId: string) => number
  updateLocalSchedule: (employeeId: string, day: string, timeSlots: TimeSlot[]) => void
  getEmployeeScheduleForDay: (employeeId: string, day: string) => TimeSlot[]
  slotTypeConfig: {
    [key: string]: {
      label: string
      icon: any
      bgColor: string
      borderColor: string
      textColor: string
    }
  }
  currentWeekOffset: number
  setCurrentWeekOffset: (offset: number) => void
  setSchedules: React.Dispatch<React.SetStateAction<Record<string, TimeSlot[]>>>
  setEmployees: React.Dispatch<React.SetStateAction<EmployeeWithSchedule[]>>
  reloadSchedules: () => Promise<void>
}) {
  // Regrouper tous les useState au début
  const [copyFromWeek, setCopyFromWeek] = useState(currentWeekOffset - 1);
  const [copyToWeek, setCopyToWeek] = useState(currentWeekOffset);
  const [selectedEmployeesForCopy, setSelectedEmployeesForCopy] = useState<string[]>([]);
  const [selectedEmployeeForDetail, setSelectedEmployeeForDetail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWorkOptions, setShowWorkOptions] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStartTime, setCustomStartTime] = useState("");
  const [customEndTime, setCustomEndTime] = useState("");
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedType, setSelectedType] = useState<TimeSlot["type"] | null>(null);
  const [hoursData, setHoursData] = useState<Record<string, Record<string, string>>>({});
  const [totalHours, setTotalHours] = useState<Record<string, number>>({});
  const { toast } = useToast();
  const [editingSlot, setEditingSlot] = useState<{ day: string, index: number } | null>(null);
  const [isAbsenceLoading, setIsAbsenceLoading] = useState(false);
  // Regrouper tous les useEffect après les useState
  useEffect(() => {
    const loadData = () => {
      setLoading(true);
      const newHoursData: Record<string, Record<string, string>> = {};
      const newTotalHours: Record<string, number> = {};

      for (const employee of employees) {
        newHoursData[employee.id] = {};
        for (const day of daysOfWeek) {
          const schedule = getEmployeeScheduleForDay(employee.id, day);
          const workSlots = schedule.filter((slot: TimeSlot) => slot.type === "work");
          const vacationSlots = schedule.filter((slot: TimeSlot) => slot.type !== "work");

          if (workSlots.length === 0 && vacationSlots.length === 0) {
            newHoursData[employee.id][day] = "Repos";
          } else if (workSlots.length === 0 && vacationSlots.length > 0) {
            newHoursData[employee.id][day] = vacationSlots.map((slot: TimeSlot) => slotTypeConfig[slot.type].label).join(", ");
          } else {
            newHoursData[employee.id][day] = workSlots.map((slot: TimeSlot) => `${slot.start}-${slot.end}`).join(", ");
          }
        }
        newTotalHours[employee.id] = getTotalHoursForWeek(employee.id);
      }

      setHoursData(newHoursData);
      setTotalHours(newTotalHours);
      setLoading(false);
    };

    loadData();
  }, [employees, currentWeekKey, daysOfWeek, getEmployeeScheduleForDay, getTotalHoursForWeek, slotTypeConfig]);

  // Fonctions utilitaires
  const getWeekOptions = () => {
    const options = [];
    for (let i = -4; i <= 4; i++) {
      const weekDates = getWeekDates(i);
      const weekNum = getWeekNumber(weekDates[0]);
      options.push({
        value: i,
        label: `Semaine ${weekNum} (${formatDate(weekDates[0])} - ${formatDate(weekDates[6])})`,
        dates: weekDates,
      });
    }
    return options;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const copySchedules = async () => {
    try {
      const fromWeekKey = getWeekKey(copyFromWeek);
      const toWeekKey = getWeekKey(copyToWeek);

      const employeesToCopy = selectedEmployeesForCopy.length > 0 ? selectedEmployeesForCopy : employees.map((emp) => emp.id);

      // Récupérer les plannings de la semaine source
      const response = await fetch(`/api/schedules?weekKey=${fromWeekKey}`);
      if (!response.ok) throw new Error("Failed to fetch source schedules");
      const sourceSchedules = await response.json();

      // Copier les plannings pour chaque employé
      for (const employeeId of employeesToCopy) {
        const employeeSchedules = sourceSchedules.filter((s: any) => s.employeeId === employeeId);
        for (const schedule of employeeSchedules) {
          await fetch("/api/schedules", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              employeeId,
              weekKey: toWeekKey,
              day: schedule.day,
              timeSlots: schedule.timeSlots,
            }),
          });
        }
      }

      // Recharger les données depuis la base de données
      const schedulesResponse = await fetch(`/api/schedules?weekKey=${currentWeekKey}`);
      if (schedulesResponse.ok) {
        const data = await schedulesResponse.json();
        const schedulesMap: Record<string, any[]> = {};

        if (Array.isArray(data)) {
          data.forEach((schedule: any) => {
            const key = `${schedule.employeeId}-${schedule.day}`;
            schedulesMap[key] = Array.isArray(schedule.timeSlots) ? schedule.timeSlots : [];
          });
        }

        setSchedules(schedulesMap);

        // Mettre à jour les employés avec les nouvelles données
        setEmployees((prev) =>
          prev.map((emp) => ({
            ...emp,
            schedule: {
              ...emp.schedule,
              [currentWeekKey]: daysOfWeek.reduce((acc, day) => {
                acc[day] = Array.isArray(schedulesMap[`${emp.id}-${day}`]) ? schedulesMap[`${emp.id}-${day}`] : [];
                return acc;
              }, {} as { [day: string]: TimeSlot[] }),
            },
          }))
        );
      }

      toast({
        title: "Succès",
        description: "Plannings copiés avec succès",
      });
      setSelectedEmployeesForCopy([]);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier les plannings",
        variant: "destructive",
      });
    }
  };

  const clearEmployeeDay = async (employeeId: string, day: string) => {
    try {
      const response = await fetch(
        `/api/schedules?employeeId=${employeeId}&weekKey=${currentWeekKey}&day=${day}`,
        { method: "DELETE" }
      )
      if (!response.ok) throw new Error("Failed to clear schedule")

      // Mettre à jour l'état local immédiatement
      updateLocalSchedule(employeeId, day, [])

      // Mettre à jour les schedules
      setSchedules((prev: Record<string, TimeSlot[]>) => {
        const newSchedules = { ...prev }
        delete newSchedules[`${employeeId}-${day}`]
        return newSchedules
      })

      toast({
        title: "Succès",
        description: "Journée effacée avec succès",
      })
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'effacer la journée",
        variant: "destructive",
      })
    }
  }

  const setStandardWorkDay = async (employeeId: string, day: string, type: "full" | "morning" | "afternoon") => {
    try {
      let timeSlots: TimeSlot[] = []
      switch (type) {
        case "full":
          timeSlots = [
            { start: "09:00", end: "17:00", isWorking: true, type: "work" as const },
          ]
          break
        case "morning":
          timeSlots = [{ start: "09:00", end: "12:00", isWorking: true, type: "work" as const }]
          break
        case "afternoon":
          timeSlots = [{ start: "13:00", end: "17:00", isWorking: true, type: "work" as const }]
          break
      }

      const response = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          weekKey: currentWeekKey,
          day,
          timeSlots,
        }),
      })

      if (!response.ok) throw new Error("Failed to update schedule")

      // Mettre à jour l'état local
      updateLocalSchedule(employeeId, day, timeSlots)

      toast({
        title: "Succès",
        description: "Planning mis à jour avec succès",
      })
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le planning",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Semaine selector en haut de la vue Gestion */}
      <div className="flex justify-end">
        <WeekSelector
          currentWeekOffset={currentWeekOffset}
          setCurrentWeekOffset={setCurrentWeekOffset}
          currentWeekDates={currentWeekDates}
          weekNumber={weekNumber}
        />
      </div>
      {/* Outil de copier-coller */}
      <div className="rounded-lg border bg-background">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Copier-Coller Planning
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label>Copier depuis la semaine</Label>
                <Select
                  value={copyFromWeek.toString()}
                  onValueChange={(value) => setCopyFromWeek(Number.parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getWeekOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Vers la semaine</Label>
                <Select
                  value={copyToWeek.toString()}
                  onValueChange={(value) => setCopyToWeek(Number.parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getWeekOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <Label>Employés à copier (laisser vide pour tous)</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {employees.map((employee) => (
                  <div key={employee.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`copy-${employee.id}`}
                      checked={selectedEmployeesForCopy.includes(employee.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEmployeesForCopy([...selectedEmployeesForCopy, employee.id])
                        } else {
                          setSelectedEmployeesForCopy(selectedEmployeesForCopy.filter((id) => id !== employee.id))
                        }
                      }}
                      className="rounded"
                    />
                    <label htmlFor={`copy-${employee.id}`} className="text-sm flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: employee.color }} />
                      {employee.name}
                    </label>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button onClick={copySchedules} className="flex-1" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Copie en cours...
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copier Planning
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setSelectedEmployeesForCopy([])}>
                  Tout désélectionner
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des employés simplifiée */}
      <div className="rounded-lg border bg-background">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employés - Semaine {weekNumber}
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map((employee: EmployeeWithSchedule) => (
              <div key={employee.id} className="rounded-lg border bg-background p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: employee.color }} />
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={`https://avatar.vercel.sh/${employee.id}.png`} alt={employee.name} />
                    <AvatarFallback className="text-sm">
                      {employee.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-medium text-sm flex items-center gap-2">
                      {employee.name}
                      {/* Sélecteur de couleur */}
                      <Select
                        value={employee.color}
                        onValueChange={async (color) => {
                          // Appel API pour mettre à jour la couleur
                          const response = await fetch(`/api/employees/${employee.id}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ color }),
                          });
                          if (response.ok) {
                            setEmployees((prev) =>
                              prev.map((emp) =>
                                emp.id === employee.id ? { ...emp, color } : emp
                              )
                            );
                            toast({
                              title: "Succès",
                              description: "Couleur modifiée avec succès",
                            });
                          } else {
                            toast({
                              title: "Erreur",
                              description: "Impossible de modifier la couleur",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="w-8 h-8 p-0 border-none bg-transparent">
                          <span className="sr-only">Changer la couleur</span>
                          <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: employee.color }} />
                        </SelectTrigger>
                        <SelectContent>
                          {EMPLOYEE_COLORS.map((color) => (
                            <SelectItem key={color} value={color} className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: color }} />
                              <span>{color}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </h3>
                    <p className="text-xs text-muted-foreground">{employee.role}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Heures travaillées:</span>
                    <Badge variant="outline">{getTotalHoursForWeek(employee.id)}h</Badge>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        setSelectedEmployeeForDetail(selectedEmployeeForDetail === employee.id ? null : employee.id)
                      }
                    >
                      {selectedEmployeeForDetail === employee.id ? "Masquer" : "Gérer"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCopyFromWeek(currentWeekOffset - 1)
                        setCopyToWeek(currentWeekOffset)
                        setSelectedEmployeesForCopy([employee.id])
                        copySchedules()
                      }}
                      title="Copier depuis la semaine précédente"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Planning détaillé (affiché si sélectionné) */}
                {selectedEmployeeForDetail === employee.id && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-1 gap-3">
                      {daysOfWeek.map((day, dayIndex) => (
                        <div key={day} className="border rounded p-3 bg-muted/50">
                          <div className="flex justify-between items-center mb-2">
                            <div className="text-sm font-medium capitalize">
                              {day} {formatDate(currentWeekDates[dayIndex])}
                            </div>
                            <div className="flex gap-1">
                              {/* Ajout/édition de créneau */}
                              <Dialog modal={false}>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-6 px-2">
                                    {employee.schedule?.[currentWeekKey]?.[day]?.length > 0 ? (
                                      <Edit className="h-3 w-3" />
                                    ) : (
                                      <Plus className="h-3 w-3" />
                                    )}
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md p-6 rounded-xl shadow-xl">
                                  <DialogHeader>
                                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                      <Plus className="h-5 w-5 text-blue-600" />
                                      Ajouter un créneau
                                    </DialogTitle>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {employee.name} – {day} {formatDate(currentWeekDates[dayIndex])}
                                    </p>
                                  </DialogHeader>
                                  <Separator className="my-3" />
                                  {/* Résumé dynamique */}
                                  {selectedType && (
                                    <div className="mb-2 flex items-center gap-2 text-base font-medium">
                                      <span className="text-muted-foreground">Type sélectionné :</span>
                                      {(() => {
                                        const config = slotTypeConfig[selectedType];
                                        const Icon = config.icon;
                                        return (
                                          <span className="flex items-center gap-1 px-2 py-1 rounded bg-muted border">
                                            <Icon className="h-4 w-4" />
                                            {config.label}
                                          </span>
                                        );
                                      })()}
                                    </div>
                                  )}
                                  {/* Étape 1 : Sélection du type de créneau */}
                                  <div>
                                    <Label className="block mb-2">Type de créneau</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                      {Object.entries(slotTypeConfig).map(([type, config]) => {
                                        const Icon = config.icon;
                                        return (
                                          <button
                                            key={type}
                                            type="button"
                                            aria-pressed={selectedType === type}
                                            onClick={() => {
                                              setSelectedType(type as TimeSlot["type"]);
                                              setShowWorkOptions(false);
                                              setShowDatePicker(false);
                                            }}
                                            className={`flex flex-col items-center justify-center gap-1 p-3 rounded-lg border transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400/60 ${selectedType === type ? "bg-blue-50 border-blue-500 shadow" : "bg-background border-muted hover:bg-muted/60"}`}
                                          >
                                            <Icon className={`h-6 w-6 ${selectedType === type ? "text-blue-600" : "text-muted-foreground"}`} />
                                            <span className="font-semibold text-sm">{config.label}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  <Separator className="my-4" />
                                  {/* Étape 2 : Formulaire selon le type sélectionné */}
                                  {selectedType === "work" && (
                                    <div className="space-y-6">
                                      <div>
                                        <Label className="block mb-2">Options rapides</Label>
                                        <div className="grid grid-cols-1 gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setStandardWorkDay(employee.id, day, "full")}
                                            className="w-full"
                                          >
                                            Journée complète (9h-17h)
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setStandardWorkDay(employee.id, day, "morning")}
                                            className="w-full"
                                          >
                                            Matin (9h-12h)
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setStandardWorkDay(employee.id, day, "afternoon")}
                                            className="w-full"
                                          >
                                            Après-midi (13h-17h)
                                          </Button>
                                        </div>
                                      </div>
                                      <Separator className="my-2" />
                                      <div>
                                        <Label className="block mb-2">Créneau personnalisé</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="space-y-2">
                                            <Label className="text-xs">Heure de début</Label>
                                            <Input
                                              type="time"
                                              value={customStartTime}
                                              onChange={(e) => setCustomStartTime(e.target.value)}
                                              className="h-8"
                                              aria-label="Heure de début"
                                            />
                                          </div>
                                          <div className="space-y-2">
                                            <Label className="text-xs">Heure de fin</Label>
                                            <Input
                                              type="time"
                                              value={customEndTime}
                                              onChange={(e) => setCustomEndTime(e.target.value)}
                                              className="h-8"
                                              aria-label="Heure de fin"
                                            />
                                          </div>
                                        </div>
                                        <Button
                                          variant="default"
                                          size="sm"
                                          className="w-full mt-2"
                                          onClick={() => {
                                            if (customStartTime && customEndTime) {
                                              const timeSlots: TimeSlot[] = [{
                                                start: customStartTime,
                                                end: customEndTime,
                                                isWorking: true,
                                                type: "work" as const,
                                              }];
                                              fetch("/api/schedules", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({
                                                  employeeId: employee.id,
                                                  weekKey: currentWeekKey,
                                                  day,
                                                  timeSlots,
                                                }),
                                              }).then(() => {
                                                updateLocalSchedule(employee.id, day, timeSlots);
                                                setCustomStartTime("");
                                                setCustomEndTime("");
                                                toast({
                                                  title: "Succès",
                                                  description: "Créneau ajouté",
                                                });
                                              });
                                            }
                                          }}
                                        >
                                          Ajouter le créneau personnalisé
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                  {selectedType && selectedType !== "work" && (
                                    <div className="space-y-6">
                                      <div>
                                        <Label className="block mb-2">Période d'absence</Label>
                                        <div className="flex flex-col gap-2">
                                          <div className="flex items-center gap-2">
                                            <CalendarIcon className="h-4 w-4 text-orange-500" />
                                            <span className="font-medium">Début : {formatDate(currentWeekDates[dayIndex])}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <CalendarIcon className="h-4 w-4 text-orange-500" />
                                            <span className="font-medium">Fin : {endDate ? format(endDate, "PPP", { locale: fr }) : <span className="text-muted-foreground">Sélectionner une date (non incluse)</span>}</span>
                                          </div>
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <Button
                                                variant="outline"
                                                className="w-full justify-start text-left font-normal mt-2"
                                                aria-label="Sélectionner la date de fin"
                                              >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {endDate ? format(endDate, "PPP", { locale: fr }) : "Sélectionner une date"}
                                              </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={8}>
                                              <Calendar
                                                mode="single"
                                                selected={endDate || undefined}
                                                onSelect={(date: Date | undefined) => setEndDate(date || null)}
                                                initialFocus
                                                locale={fr}
                                                fromDate={new Date(2000, 0, 1)}
                                                toDate={new Date(2100, 11, 31)}
                                                defaultMonth={currentWeekDates[dayIndex]}
                                              />
                                            </PopoverContent>
                                          </Popover>
                                        </div>
                                      </div>
                                      <Button
                                        variant="default"
                                        className="w-full mt-2"
                                        disabled={isAbsenceLoading}
                                        onClick={async () => {
                                          if (!endDate) return toast({ title: "Erreur", description: "Sélectionnez une date de fin", variant: "destructive" });
                                          const startDate = currentWeekDates[dayIndex];
                                          if (endDate < startDate) {
                                            toast({ title: "Erreur", description: "La date de fin doit être après la date de début", variant: "destructive" });
                                            return;
                                          }
                                          setIsAbsenceLoading(true);
                                          try {
                                            // Supprimer tous les créneaux existants sur la plage pour l'employé
                                            let current = new Date(startDate);
                                            current.setHours(0,0,0,0);
                                            const end = new Date(endDate);
                                            end.setHours(0,0,0,0);
                                            while (current <= end) {
                                              const weekKey = `${current.getFullYear()}-W${getWeekNumber(current)}`;
                                              const dayIdx = current.getDay() === 0 ? 6 : current.getDay() - 1;
                                              const dayName = daysOfWeek[dayIdx];
                                              await fetch(`/api/schedules?employeeId=${employee.id}&weekKey=${weekKey}&day=${dayName}`, { method: "DELETE" });
                                              current.setDate(current.getDate() + 1);
                                            }
                                            // Appel API range pour créer l'absence
                                            const res = await fetch("/api/schedules/range", {
                                              method: "POST",
                                              headers: { "Content-Type": "application/json" },
                                              body: JSON.stringify({
                                                employeeId: employee.id,
                                                startDate: startDate.toISOString().slice(0, 10),
                                                endDate: endDate.toISOString().slice(0, 10),
                                                slotType: selectedType,
                                              }),
                                            });
                                            if (res.ok) {
                                              const weekKeys = new Set<string>();
                                              let cur = new Date(startDate);
                                              cur.setHours(0,0,0,0);
                                              const endAbs = new Date(endDate);
                                              endAbs.setHours(0,0,0,0);
                                              while (cur <= endAbs) {
                                                weekKeys.add(`${cur.getFullYear()}-W${getWeekNumber(cur)}`);
                                                cur.setDate(cur.getDate() + 1);
                                              }
                                              const schedulesMap: Record<string, any[]> = {};
                                              for (const weekKey of weekKeys) {
                                                const schedulesResponse = await fetch(`/api/schedules?weekKey=${weekKey}`);
                                                if (schedulesResponse.ok) {
                                                  const data = await schedulesResponse.json();
                                                  if (Array.isArray(data)) {
                                                    data.forEach((schedule: any) => {
                                                      const key = `${schedule.employeeId}-${schedule.day}`;
                                                      schedulesMap[key] = Array.isArray(schedule.timeSlots) ? schedule.timeSlots : [];
                                                    });
                                                  }
                                                }
                                              }
                                              setSchedules(schedulesMap);
                                              setEmployees((prev) =>
                                                prev.map((emp) => ({
                                                  ...emp,
                                                  schedule: {
                                                    ...emp.schedule,
                                                    ...Array.from(weekKeys).reduce((acc, weekKey) => {
                                                      acc[weekKey] = daysOfWeek.reduce((acc2, d) => {
                                                        acc2[d] = Array.isArray(schedulesMap[`${emp.id}-${d}`]) ? schedulesMap[`${emp.id}-${d}`] : [];
                                                        return acc2;
                                                      }, {} as { [day: string]: TimeSlot[] });
                                                      return acc;
                                                    }, {} as { [weekKey: string]: { [day: string]: TimeSlot[] } }),
                                                  },
                                                }))
                                              );
                                              toast({ title: "Succès", description: "Absence ajoutée" });
                                              setEndDate(null);
                                              setSelectedType(null);
                                              if (reloadSchedules) await reloadSchedules();
                                            } else {
                                              toast({ title: "Erreur", description: "Impossible d'ajouter l'absence", variant: "destructive" });
                                            }
                                          } finally {
                                            setIsAbsenceLoading(false);
                                          }
                                        }}
                                      >
                                        {isAbsenceLoading ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : "Valider l'absence"}
                                      </Button>
                                    </div>
                                  )}
                                  <Separator className="my-4" />
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => { setSelectedType(null); setEndDate(null); setCustomStartTime(""); setCustomEndTime(""); setShowWorkOptions(false); setShowDatePicker(false); }}>Annuler</Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              {employee.schedule?.[currentWeekKey]?.[day]?.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => clearEmployeeDay(employee.id, day)}
                                  className="h-6 px-2 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Créneaux du jour */}
                          <div className="space-y-1">
                            {(employee.schedule?.[currentWeekKey]?.[day] || []).map((slot: TimeSlot, index: number) => {
                              const config = slotTypeConfig[slot.type as keyof typeof slotTypeConfig] as {
                                label: string
                                icon: any
                                bgColor: string
                                borderColor: string
                                textColor: string
                              }
                              const Icon = config.icon
                              return (
                                <div
                                  key={index}
                                  className={`flex justify-between items-center p-2 rounded text-xs ${config.bgColor} ${config.borderColor} border`}
                                >
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-3 w-3" />
                                    <span className={config.textColor}>
                                      {slot.type === "work" ? `${slot.start}-${slot.end}` : config.label}
                                    </span>
                                    {slot.note && <span className="text-muted-foreground">({slot.note})</span>}
                                  </div>
                                  {/*<Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={async () => {
                                      const newSlots = Array.isArray(employee.schedule?.[currentWeekKey]?.[day])
                                        ? [...employee.schedule[currentWeekKey][day]]
                                        : [];
                                      newSlots.splice(index, 1);
                                      try {
                                        const response = await fetch("/api/schedules", {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({
                                            employeeId: employee.id,
                                            weekKey: currentWeekKey,
                                            day,
                                            timeSlots: newSlots,
                                          }),
                                        });
                                        if (response.ok) {
                                          updateLocalSchedule(employee.id, day, newSlots);
                                          setSchedules(prev => ({
                                            ...prev,
                                            [`${employee.id}-${day}`]: newSlots
                                          }));
                                          toast({
                                            title: "Succès",
                                            description: "Créneau supprimé",
                                          });
                                        }
                                      } catch (error) {
                                        toast({
                                          title: "Erreur",
                                          description: "Impossible de supprimer le créneau",
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                    className="h-4 w-4 p-0"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>*/}
                                </div>
                              )
                            })}
                            {(!employee.schedule?.[currentWeekKey]?.[day] || employee.schedule[currentWeekKey][day].length === 0) && (
                              <div className="text-xs text-muted-foreground text-center py-2">Aucun créneau</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Composant WeekSelector pour changer de semaine
function WeekSelector({
  currentWeekOffset,
  setCurrentWeekOffset,
  currentWeekDates,
  weekNumber
}: {
  currentWeekOffset: number;
  setCurrentWeekOffset: (offset: number) => void;
  currentWeekDates: Date[];
  weekNumber: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => setCurrentWeekOffset(currentWeekOffset - 1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="text-center px-2">
        <div className="font-medium">
          Semaine {weekNumber} ({formatDate(currentWeekDates[0])} - {formatDate(currentWeekDates[6])})
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={() => setCurrentWeekOffset(currentWeekOffset + 1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function PlanningPage() {
  const [employees, setEmployees] = useState<EmployeeWithSchedule[]>([])
  const [schedules, setSchedules] = useState<Record<string, TimeSlot[]>>({})
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [openDialogs, setOpenDialogs] = useState<Record<string, boolean>>({})
  const [viewMode, setViewMode] = useState<'calendar' | 'person' | 'slot'>('calendar')
  const { toast } = useToast();

  const currentWeekDates = useMemo(() => getWeekDates(currentWeekOffset), [currentWeekOffset])
  const currentWeekKey = useMemo(() => getWeekKey(currentWeekOffset), [currentWeekOffset])
  const weekNumber = useMemo(() => getWeekNumber(currentWeekDates[0]), [currentWeekDates])

  const [resizeSlot, setResizeSlot] = useState<{
    employeeId: string;
    day: string;
    slotIndex: number;
    type: 'start' | 'end';
  } | null>(null);
  const [resizeValue, setResizeValue] = useState<string | null>(null);
  const slotDragRef = useRef<HTMLDivElement | null>(null);

  // Ajout de l'état pour le drag & drop de créneau
  const [dragSlot, setDragSlot] = useState<{
    employeeId: string;
    day: string;
    slotIndex: number;
    duration: number; // en minutes
    originalStart: string;
  } | null>(null);
  const [dragGhostTime, setDragGhostTime] = useState<string | null>(null);
  const dragOffsetRef = useRef<number>(0);

  // Gestion du drag & drop vertical
  useEffect(() => {
    if (!dragSlot) return;
    const onMouseMove = (e: MouseEvent) => {
      const grid = document.getElementById(`day-grid-${dragSlot.day}`);
      if (!grid) return;
      const rect = grid.getBoundingClientRect();
      let y = e.clientY - rect.top - dragOffsetRef.current;
      y = Math.max(0, Math.min(y, rect.height - 1));
      const hour = 8 + (y / rect.height) * 14;
      const h = Math.floor(hour);
      const m = Math.round((hour - h) * 60 / 5) * 5;
      let time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      // Clamp pour ne pas dépasser la journée
      const [origH, origM] = dragSlot.originalStart.split(':').map(Number);
      const maxMinutes = 22 * 60 - dragSlot.duration;
      let minutes = h * 60 + m;
      if (minutes < 8 * 60) minutes = 8 * 60;
      if (minutes > maxMinutes) minutes = maxMinutes;
      const ch = Math.floor(minutes / 60);
      const cm = minutes % 60;
      time = `${ch.toString().padStart(2, '0')}:${cm.toString().padStart(2, '0')}`;
      setDragGhostTime(time);
    };
    const onMouseUp = async () => {
      if (dragSlot && dragGhostTime && dragGhostTime !== dragSlot.originalStart) {
        const { employeeId, day, slotIndex, duration } = dragSlot;
        const slots = getEmployeeScheduleForDay(employeeId, day);
        const slot = slots[slotIndex];
        if (!slot) return;
        // Calcule la nouvelle heure de fin
        const [sh, sm] = dragGhostTime.split(':').map(Number);
        const startMinutes = sh * 60 + sm;
        const endMinutes = startMinutes + duration;
        const eh = Math.floor(endMinutes / 60);
        const em = endMinutes % 60;
        const newStart = dragGhostTime;
        const newEnd = `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;
        const newSlots = slots.map((s, i) => i === slotIndex ? { ...s, start: newStart, end: newEnd } : s);
        await updateLocalSchedule(employeeId, day, newSlots);
      }
      setDragSlot(null);
      setDragGhostTime(null);
    };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grab';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragSlot, dragGhostTime]);

  // Charger les employés
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch("/api/employees")
        if (response.ok) {
          const data = await response.json()
          // Initialiser la propriété schedule pour chaque employé
          const employeesWithSchedule = data.map((employee: Employee) => ({
            ...employee,
            schedule: {}
          }))
          setEmployees(employeesWithSchedule)
        }
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les employés",
          variant: "destructive",
        })
      }
    }

    fetchEmployees()
  }, [toast])

  // Charger les plannings de la semaine
  useEffect(() => {
    if (employees.length === 0) return;
    setLoading(true);

    const loadSchedules = async () => {
      try {
        const response = await fetch(`/api/schedules?weekKey=${currentWeekKey}`);
        if (!response.ok) throw new Error("Failed to fetch schedules");

        const data = await response.json();
        const schedulesMap: Record<string, any[]> = {};

        if (Array.isArray(data)) {
          data.forEach((schedule: any) => {
            const key = `${schedule.employeeId}-${schedule.day}`;
            schedulesMap[key] = Array.isArray(schedule.timeSlots) ? schedule.timeSlots : [];
          });
        }

        // Mettre à jour les schedules
        setSchedules(schedulesMap);

        // Mettre à jour les employés avec les nouvelles données
        setEmployees(prev =>
          prev.map(emp => ({
            ...emp,
            schedule: {
              ...emp.schedule,
              [currentWeekKey]: daysOfWeek.reduce((acc, day) => {
                acc[day] = Array.isArray(schedulesMap[`${emp.id}-${day}`]) ? schedulesMap[`${emp.id}-${day}`] : [];
                return acc;
              }, {} as { [day: string]: TimeSlot[] }),
            },
          }))
        );
      } catch (error) {
        console.error("Erreur lors du chargement des plannings:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les plannings",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    // On rend loadSchedules accessible via une ref
    (window as any).reloadSchedules = loadSchedules;
    loadSchedules();
  }, [currentWeekKey, employees.length, daysOfWeek, toast]);

  // Ajouter un effet pour initialiser le créneau du samedi
  // useEffect(() => {
  //   const initializeSaturdaySlot = async () => {
  //     const saturdayEmployee = getSaturdayEmployee();
  //     if (saturdayEmployee) {
  //       const timeSlots: TimeSlot[] = [{
  //         start: "10:00",
  //         end: "20:00",
  //         isWorking: true,
  //         type: "work" as const,
  //       }];
  //
  //       try {
  //         const response = await fetch("/api/schedules", {
  //           method: "POST",
  //           headers: { "Content-Type": "application/json" },
  //           body: JSON.stringify({
  //             employeeId: saturdayEmployee,
  //             weekKey: currentWeekKey,
  //             day: "samedi",
  //             timeSlots,
  //           }),
  //         });
  //
  //         if (response.ok) {
  //           // Mettre à jour l'état local
  //           updateLocalSchedule(saturdayEmployee, "samedi", timeSlots);
  //           setSchedules(prev => ({
  //             ...prev,
  //             [`${saturdayEmployee}-samedi`]: timeSlots
  //           }));
  //         }
  //       } catch (error) {
  //         console.error("Erreur lors de l'initialisation du créneau du samedi:", error);
  //       }
  //     }
  //   };
  //
  //   initializeSaturdaySlot();
  // }, [currentWeekKey]);

  // Ajouter une fonction pour obtenir le prochain employé disponible pour le week-end
  const getNextWeekendEmployee = (currentEmployeeId: string | null): string => {
    const availableEmployees = employees.filter(emp => emp.isActive)
    if (availableEmployees.length === 0) return ""

    if (!currentEmployeeId) return availableEmployees[0].id

    const currentIndex = availableEmployees.findIndex(emp => emp.id === currentEmployeeId)
    const nextIndex = (currentIndex + 1) % availableEmployees.length
    return availableEmployees[nextIndex].id
  }

  // Modifier la fonction updateLocalSchedule
  const updateLocalSchedule = async (employeeId: string, day: string, timeSlots: TimeSlot[]) => {
    try {
      // Mettre à jour la base de données
      const response = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          weekKey: currentWeekKey,
          day,
          timeSlots,
        }),
      });

      if (!response.ok) throw new Error("Failed to update schedule");

      // Mettre à jour l'état local des schedules
      setSchedules(prev => ({
          ...prev,
        [`${employeeId}-${day}`]: timeSlots,
      }));

      // Mettre à jour l'état local des employés
      setEmployees(prev =>
        prev.map(emp =>
          emp.id === employeeId
            ? {
                ...emp,
                schedule: {
                  ...emp.schedule,
                  [currentWeekKey]: {
                    ...emp.schedule[currentWeekKey],
                    [day]: timeSlots,
                  },
                },
              }
            : emp
        )
      );

      // Recharger les données depuis la base de données pour s'assurer de la synchronisation
      const schedulesResponse = await fetch(`/api/schedules?weekKey=${currentWeekKey}`);
      if (schedulesResponse.ok) {
        const data = await schedulesResponse.json();
        const schedulesMap: Record<string, any[]> = {};

        if (Array.isArray(data)) {
          data.forEach((schedule: any) => {
            const key = `${schedule.employeeId}-${schedule.day}`;
            schedulesMap[key] = Array.isArray(schedule.timeSlots) ? schedule.timeSlots : [];
          });
        }

        setSchedules(schedulesMap);

        // Mettre à jour les employés avec les nouvelles données
        setEmployees(prev =>
          prev.map(emp => ({
            ...emp,
            schedule: {
              ...emp.schedule,
              [currentWeekKey]: daysOfWeek.reduce((acc, day) => {
                acc[day] = Array.isArray(schedulesMap[`${emp.id}-${day}`]) ? schedulesMap[`${emp.id}-${day}`] : [];
                return acc;
              }, {} as { [day: string]: TimeSlot[] }),
            },
          }))
        );
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du planning:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le planning",
        variant: "destructive",
      });
    }
  };

  // Modifier la fonction getSaturdayEmployee pour qu'elle soit synchrone
  // const getSaturdayEmployee = (): string | null => {
  //   // Chercher d'abord dans les schedules existants
  //   for (const employee of employees) {
  //     const saturdaySchedule = employee.schedule?.[currentWeekKey]?.["samedi"];
  //     if (saturdaySchedule && saturdaySchedule.length > 0) {
  //       return employee.id;
  //     }
  //   }
  //
  //   // Si aucun employé n'a de créneau, retourner le premier employé actif
  //   const activeEmployees = employees.filter(emp => emp.isActive);
  //   return activeEmployees.length > 0 ? activeEmployees[0].id : null;
  // };

  // Modifier la fonction getEmployeeScheduleForDay pour retourner les créneaux correctement
  const getEmployeeScheduleForDay = (employeeId: string, day: string): TimeSlot[] => {
    // Récupérer les créneaux depuis l'état local
    const schedule = schedules[`${employeeId}-${day}`];

    // Si des créneaux existent, les retourner
    if (Array.isArray(schedule) && schedule.length > 0) {
      return schedule;
    }

    // Si aucun créneau n'est trouvé, retourner un tableau vide
    return [];
  };

  // Modifier la fonction getTotalHoursForWeek pour calculer correctement les heures
  const getTotalHoursForWeek = (employeeId: string): number => {
    let total = 0;

    for (const day of daysOfWeek) {
      const daySchedule = getEmployeeScheduleForDay(employeeId, day);
      const workSlots = daySchedule.filter(slot => slot.type === "work");

      for (const slot of workSlots) {
        const start = Number.parseInt(slot.start.split(":")[0]) + Number.parseInt(slot.start.split(":")[1]) / 60;
        const end = Number.parseInt(slot.end.split(":")[0]) + Number.parseInt(slot.end.split(":")[1]) / 60;
        total += end - start;
      }
    }

    return Math.round(total * 10) / 10;
  };

  // Modifier la fonction getEmployeeHoursForDay pour gérer l'asynchrone
  const getEmployeeHoursForDay = (employeeId: string, day: string): string => {
    const daySchedule = getEmployeeScheduleForDay(employeeId, day);
    const workSlots = daySchedule.filter((slot: TimeSlot) => slot.type === "work");
    const vacationSlots = daySchedule.filter((slot: TimeSlot) => slot.type !== "work");

    if (workSlots.length === 0 && vacationSlots.length === 0) return "Repos";
    if (workSlots.length === 0 && vacationSlots.length > 0) {
      return vacationSlots.map((slot: TimeSlot) => slotTypeConfig[slot.type].label).join(", ");
    }

    return workSlots.map((slot: TimeSlot) => `${slot.start}-${slot.end}`).join(", ");
  };

  const getTimeSlotPosition = (startTime: string, endTime: string) => {
    const startHour = Number.parseInt(startTime.split(":")[0]) + Number.parseInt(startTime.split(":")[1]) / 60
    const endHour = Number.parseInt(endTime.split(":")[0]) + Number.parseInt(endTime.split(":")[1]) / 60

    const top = ((startHour - 8) / 14) * 100
    const height = ((endHour - startHour) / 14) * 100

    return { top: `${top}%`, height: `${height}%` }
  }

  const TableView = () => {
    const [hoursData, setHoursData] = useState<Record<string, Record<string, string>>>({});
    const [totalHours, setTotalHours] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const loadData = () => {
        setLoading(true);
        const newHoursData: Record<string, Record<string, string>> = {};
        const newTotalHours: Record<string, number> = {};

        for (const employee of employees) {
          newHoursData[employee.id] = {};
          for (const day of daysOfWeek) {
            newHoursData[employee.id][day] = getEmployeeHoursForDay(employee.id, day);
          }
          newTotalHours[employee.id] = getTotalHoursForWeek(employee.id);
        }

        setHoursData(newHoursData);
        setTotalHours(newTotalHours);
        setLoading(false);
      };

      loadData();
    }, [employees, currentWeekKey]);

    if (loading) {
                            return (
        <div className="flex items-center justify-center h-[600px]">
          <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
      );
    }

    return (
      <div className="rounded-lg border bg-background">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <List className="h-5 w-5" />
            Vue Tableau
          </h2>
          <WeekSelector
            currentWeekOffset={currentWeekOffset}
            setCurrentWeekOffset={setCurrentWeekOffset}
            currentWeekDates={currentWeekDates}
            weekNumber={weekNumber}
          />
        </div>
        <div className="p-6">
        <ScrollArea className="h-[600px]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium sticky left-0 bg-background z-10">Employé</th>
                {daysOfWeek.map((day, index) => (
                      <th key={day} className="text-center p-3 font-medium min-w-32 border-b">
                        <div className="font-semibold">{day}</div>
                        <div className="text-xs text-muted-foreground font-normal">{formatDate(currentWeekDates[index])}</div>
                  </th>
                ))}
                    <th className="text-center p-3 font-medium border-b">Total</th>
              </tr>
              </thead>
              <tbody>
              {employees.map((employee) => (
                    <tr key={employee.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="p-3 sticky left-0 bg-background z-10">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: employee.color }} />
                        <Avatar className="h-8 w-8">
                              <AvatarImage src={`https://avatar.vercel.sh/${employee.id}.png`} alt={employee.name} />
                          <AvatarFallback className="text-xs">
                            {employee.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div>
                        <div className="font-medium">{employee.name}</div>
                            <div className="text-sm text-muted-foreground">{employee.role}</div>
                      </div>
                    </div>
                  </td>
                  {daysOfWeek.map((day) => (
                        <td key={day} className="p-3 text-center border-b">
                      <div className="space-y-1">
                            <div className="text-sm">{hoursData[employee.id]?.[day] || "Chargement..."}</div>
                      </div>
                    </td>
                  ))}
                      <td className="p-3 text-center font-medium border-b">{totalHours[employee.id] || 0}h</td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        </ScrollArea>
        </div>
      </div>
    );
  };

  // Modifier la fonction handleSaturdayEmployeeChange pour recharger les données
  const handleSaturdayEmployeeChange = async (employeeId: string, day: string) => {
    // Supprimer le créneau de travail pour ce jour pour tous les employés
    for (const emp of employees) {
      await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: emp.id,
          weekKey: currentWeekKey,
          day,
          timeSlots: [],
        }),
      });
    }
    // Si on veut assigner quelqu'un
    if (employeeId) {
      const timeSlot: TimeSlot = {
        start: "10:00",
        end: "20:00",
        isWorking: true,
        type: "work"
      };
      await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          weekKey: currentWeekKey,
          day,
          timeSlots: [timeSlot],
        }),
      });
    }
    // Recharge les plannings
    const schedulesResponse = await fetch(`/api/schedules?weekKey=${currentWeekKey}`);
    if (schedulesResponse.ok) {
      const data = await schedulesResponse.json();
      const schedulesMap: Record<string, any[]> = {};
      if (Array.isArray(data)) {
        data.forEach((schedule: any) => {
          const key = `${schedule.employeeId}-${schedule.day}`;
          schedulesMap[key] = Array.isArray(schedule.timeSlots) ? schedule.timeSlots : [];
        });
      }
      setSchedules(schedulesMap);
      setEmployees((prev) =>
        prev.map((emp) => ({
          ...emp,
          schedule: {
            ...emp.schedule,
            [currentWeekKey]: daysOfWeek.reduce((acc, d) => {
              acc[d] = Array.isArray(schedulesMap[`${emp.id}-${d}`]) ? schedulesMap[`${emp.id}-${d}`] : [];
              return acc;
            }, {} as { [day: string]: TimeSlot[] }),
          },
        }))
      );
    }
  };

  // Modifier la fonction getOverlappingTimeSlots
  const getOverlappingTimeSlots = (day: string) => {
    const slots: Array<{
      employee: EmployeeWithSchedule;
      slot: TimeSlot;
      startHour: number;
      endHour: number;
    }> = [];

    employees.forEach(employee => {
      const daySchedule = getEmployeeScheduleForDay(employee.id, day);
      daySchedule.forEach(slot => {
        const startHour = Number.parseInt(slot.start.split(":")[0]) + Number.parseInt(slot.start.split(":")[1]) / 60;
        const endHour = Number.parseInt(slot.end.split(":")[0]) + Number.parseInt(slot.end.split(":")[1]) / 60;
        slots.push({ employee, slot, startHour, endHour });
      });
    });

    return slots.sort((a, b) => a.startHour - b.startHour);
  };

  // Ajoute une fonction utilitaire pour calculer les colonnes de placement des créneaux (calendar event stacking)
  type StackedSlot = { employee: any, slot: any, startHour: number, endHour: number, slotColumn?: number };
  function getStackedSlots(daySlots: Array<StackedSlot>) {
    // Trie par heure de début
    const sorted: StackedSlot[] = [...daySlots].sort((a, b) => a.startHour - b.startHour || a.endHour - b.endHour);
    const columns: Array<Array<StackedSlot>> = [];
    sorted.forEach(slot => {
      // Cherche une colonne où ce créneau ne chevauche pas le dernier créneau de la colonne
      let placed = false;
      for (let col = 0; col < columns.length; col++) {
        const last = columns[col][columns[col].length - 1];
        if (last.endHour <= slot.startHour) {
          columns[col].push(slot);
          slot.slotColumn = col;
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([slot]);
        slot.slotColumn = columns.length - 1;
      }
    });
    // maxOverlap = nombre de colonnes nécessaires
    const maxOverlap = columns.length;
    return { stacked: sorted, maxOverlap };
  }

  // Gestion globale du drag
  useEffect(() => {
    if (!resizeSlot) return;
    const onMouseMove = (e: MouseEvent) => {
      if (!slotDragRef.current) return;
      const rect = slotDragRef.current.parentElement!.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const totalHeight = rect.height;
      const hour = 8 + (y / totalHeight) * 14;
      const h = Math.floor(hour);
      const m = Math.round((hour - h) * 60 / 5) * 5;
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      setResizeValue(time);
    };
    const onMouseUp = async () => {
      if (resizeSlot && resizeValue) {
        const { employeeId, day, slotIndex, type } = resizeSlot;
        const slots = getEmployeeScheduleForDay(employeeId, day);
        const slot = slots[slotIndex];
        if (!slot) return;
        let newStart = slot.start;
        let newEnd = slot.end;
        if (type === 'start' && resizeValue < slot.end) newStart = resizeValue;
        if (type === 'end' && resizeValue > slot.start) newEnd = resizeValue;
        if (newStart !== slot.start || newEnd !== slot.end) {
          const newSlots = slots.map((s, i) => i === slotIndex ? { ...s, start: newStart, end: newEnd } : s);
          await updateLocalSchedule(employeeId, day, newSlots);
        }
      }
      setResizeSlot(null);
      setResizeValue(null);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [resizeSlot, resizeValue]);

  // Ajout d'un style pour la ligne ghost et le label d'heure
  const ghostLineStyle = {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    height: 2,
    background: '#2563eb',
    zIndex: 20,
    pointerEvents: 'none' as const,
  };
  const ghostLabelStyle = {
    position: 'absolute' as const,
    left: '100%',
    marginLeft: 8,
    background: '#2563eb',
    color: '#fff',
    borderRadius: 4,
    padding: '2px 8px',
    fontSize: 12,
    fontWeight: 700,
    zIndex: 30,
    pointerEvents: 'none' as const,
    boxShadow: '0 2px 8px #2563eb44',
  };

  // Ajoute un style pour le label d'aperçu horaire
  const previewLabelStyle = {
    position: 'absolute' as const,
    left: '100%',
    marginLeft: 12,
    background: '#25a6eb',
    color: '#fff',
    borderRadius: 4,
    padding: '4px 10px',
    fontSize: 14,
    fontWeight: 700,
    zIndex: 40,
    pointerEvents: 'none' as const,
    boxShadow: '0 2px 8px #22c55e44',
    whiteSpace: 'nowrap' as const,
  };

  // Empêcher la sélection de texte pendant le resize
  useEffect(() => {
    if (resizeSlot != null) {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ns-resize';
    } else {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }
    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [resizeSlot]);

  // Ajout de l'état pour les jours fériés
  const [holidays, setHolidays] = useState<{ [date: string]: string }>({});

  useEffect(() => {
    fetch('https://etalab.github.io/jours-feries-france-data/json/metropole.json')
      .then(res => res.json())
      .then(setHolidays);
  }, []);

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
            <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-8 w-8 text-blue-600" />
            Planning
              </h1>
          <p className="text-sm text-muted-foreground mt-1">Gérez les plannings de votre équipe</p>
          </div>
          <div className="flex items-center gap-4">
          <Link href="/employees">
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Gérer les Employés
            </Button>
          </Link>
            <Link href="/planning/absences">
              <Button variant="outline">
                <PhoneCall className="h-4 w-4 mr-2" />
                Gérer les Absences
              </Button>
            </Link>
            <Link href="/planning">
              <Button variant="outline">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Voir le Planning
              </Button>
            </Link>
            <Link href="/planning/extraction">
              <Button variant="secondary">
                Extraction
              </Button>
            </Link>
          </div>
        </div>

        <Tabs defaultValue="calendar" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-xl">
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Grid className="h-4 w-4" />
              Calendrier
            </TabsTrigger>
            <TabsTrigger value="management" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Gestion
            </TabsTrigger>
            <TabsTrigger value="table" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Tableau
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            {/* Sélecteur de vue supplémentaire */}
            <div className="flex gap-2 my-4">
              <Button variant={viewMode === 'calendar' ? 'default' : 'outline'} onClick={() => setViewMode('calendar')}>Vue calendrier</Button>
              <Button variant={viewMode === 'person' ? 'default' : 'outline'} onClick={() => setViewMode('person')}>Vue par personne</Button>
              <Button variant={viewMode === 'slot' ? 'default' : 'outline'} onClick={() => setViewMode('slot')}>Vue par créneau</Button>
            </div>
            {/* Affichage exclusif de la vue sélectionnée */}
            {viewMode === 'calendar' && (
              <>
                {/* Légende des employés */}
                <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted rounded-lg">
                  {employees.map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center gap-2 cursor-move"
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.setData('employeeId', employee.id);
                      }}
                    >
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: employee.color }} />
                      <span className="text-sm font-medium">{employee.name}</span>
                      <span className="text-xs text-muted-foreground">({getTotalHoursForWeek(employee.id)}h)</span>
                    </div>
                  ))}
                </div>
                {/* Grille calendrier (jours ouvrés + weekend) */}
                <div className="rounded-lg border bg-background">
                  <div className="p-6 border-b">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Grid className="h-5 w-5" />
                        Planning Semaine {weekNumber}
                      </h2>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setCurrentWeekOffset(currentWeekOffset - 1)}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="text-center px-4">
                          <div className="font-medium">
                            Du {formatDate(currentWeekDates[0])} au {formatDate(currentWeekDates[6])}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {currentWeekDates[0].toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setCurrentWeekOffset(currentWeekOffset + 1)}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    {loading ? (
                      <div className="flex items-center justify-center h-[600px]">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : (
                      <>
                        {/* Jours ouvrés */}
                        <div className="mb-2">
                          <div className="font-bold text-lg mb-1">Semaine (lundi à vendredi)</div>
                          {/* Header sticky pour les jours de la semaine */}
                          <div className="grid grid-cols-[50px_repeat(5,minmax(180px,1fr))] gap-1 mb-0 sticky top-0 bg-background z-10 w-full">
                            <div className="p-2 text-center font-medium text-muted-foreground text-lg"></div>
                            {daysOfWeek.slice(0, 5).map((day, dayIndex) => {
                              const dateStr = currentWeekDates[dayIndex].toISOString().slice(0, 10);
                              const holidayName = holidays[dateStr];
                              return (
                                <div
                                  key={day}
                                  className="p-2 text-center font-bold bg-muted rounded text-lg truncate flex flex-col items-center sticky top-0 z-10"
                                  style={holidayName ? {
                                    background: `repeating-linear-gradient(135deg, #f87171 0px, #f87171 8px, #fff 8px, #fff 16px)`
                                  } : {}}
                                >
                                  <div className="font-bold flex items-center justify-center gap-2">
                                    {day}
                                    {holidayName && (
                                      <span className="ml-2 px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold border border-red-300">
                                        {holidayName}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-base text-muted-foreground">{formatDate(currentWeekDates[dayIndex])}</div>
                                </div>
                              );
                            })}
                          </div>
                          {/* Grille des créneaux */}
                          <div className="grid grid-cols-[50px_repeat(5,minmax(180px,1fr))] gap-1 mb-2 w-full">
                            <div className="space-y-1">
                              {hours.map((hour) => (
                                <div key={hour} className="h-16 p-2 text-center text-base text-muted-foreground font-semibold w-[50px] min-w-[50px] max-w-[50px]">
                                  {hour}h
                                </div>
                              ))}
                            </div>
                            {daysOfWeek.slice(0, 5).map((day, dayIndex) => {
                              const dateStr = currentWeekDates[dayIndex].toISOString().slice(0, 10);
                              const holidayName = holidays[dateStr];
                              return (
                                <div
                                  key={day}
                                  className="relative space-y-1 overflow-visible min-w-[180px]"
                                  id={`day-grid-${day}`}
                                  style={holidayName ? {
                                    background: `repeating-linear-gradient(135deg, #f87171 0px, #f87171 8px, #fff 8px, #fff 16px)`
                                  } : {}}
                                  onDragOver={e => e.preventDefault()}
                                  onDrop={async e => {
                                    const employeeId = e.dataTransfer.getData('employeeId');
                                    if (!employeeId) return;
                                    const slots = getEmployeeScheduleForDay(employeeId, day);
                                    if (slots && slots.length > 0) {
                                      toast({ title: 'Erreur', description: 'Un créneau existe déjà pour cet employé ce jour-là', variant: 'destructive' });
                                      return;
                                    }
                                    // Ajoute un créneau 09:00-17:00
                                    await updateLocalSchedule(employeeId, day, [{ start: '09:00', end: '17:00', isWorking: true, type: 'work' }]);
                                    toast({ title: 'Créneau ajouté', description: 'Journée de 8h ajoutée' });
                                  }}
                                >
                                  {hours.map((hour) => (
                                    <div
                                      key={hour}
                                      className="h-16 border border-border rounded hover:bg-muted/50 transition-colors"
                                    />
                                  ))}
                                  {/* Créneaux */}
                                  {(() => {
                                    const daySlots = getOverlappingTimeSlots(day);
                                    const { stacked, maxOverlap } = getStackedSlots(daySlots);
                                    return stacked.map(({ employee, slot, startHour, endHour, slotColumn }, index) => {
                                      const isAbsence = slot.type !== 'work';
                                      const { top, height } = getTimeSlotPosition(
                                        slot.type !== 'work' ? '08:00' : slot.start,
                                        slot.type !== 'work' ? '22:00' : slot.end
                                      );
                                      const isWork = slot.type === 'work';
                                      // Style spécial pour absences
                                      let absenceBg = 'repeating-linear-gradient(135deg, #cbd5e1 0px, #cbd5e1 10px, #f1f5f9 10px, #f1f5f9 20px)';
                                      let absenceBorder = '2px solid #64748b';
                                      let absenceOpacity = 0.85;
                                      const bgColor = employee.color || '#8884d8';
                                      const textColor = getContrastYIQ(bgColor);
                                      const hatch = !isWork ? absenceBg : bgColor;
                                      const border = !isWork ? absenceBorder : `2px solid ${bgColor}`;
                                      const opacity = !isWork ? absenceOpacity : 1;
                                      const width = `calc(${100 / maxOverlap}% - 4px)`;
                                      const left = `calc(${(slotColumn || 0) * 100 / maxOverlap}% + 2px)`;
                                      // Identifiant unique du slot
                                      const slotIndex = getEmployeeScheduleForDay(employee.id, day).findIndex(s => s.start === slot.start && s.end === slot.end && s.type === slot.type);
                                      // Affichage temporaire pendant le drag
                                      let displayStart = slot.start;
                                      let displayEnd = slot.end;
                                      if (resizeSlot && resizeSlot.employeeId === employee.id && resizeSlot.day === day && resizeSlot.slotIndex === slotIndex) {
                                        if (resizeSlot.type === 'start' && resizeValue) displayStart = resizeValue < slot.end ? resizeValue : slot.start;
                                        if (resizeSlot.type === 'end' && resizeValue) displayEnd = resizeValue > slot.start ? resizeValue : slot.end;
                                      }
                                      return (
                                        <div
                                          key={`${employee.id}-${slot.start}-${slot.end}`}
                                          ref={el => {
                                            if (resizeSlot != null && resizeSlot.employeeId === employee.id && resizeSlot.day === day && resizeSlot.slotIndex === slotIndex) {
                                              slotDragRef.current = el;
                                            }
                                          }}
                                          className={`absolute rounded-lg shadow-lg p-1 text-sm font-bold flex flex-col items-center justify-center transition-all duration-200 hover:scale-[1.03] group ${resizeSlot != null && resizeSlot.employeeId === employee.id && resizeSlot.day === day && resizeSlot.slotIndex === slotIndex ? 'ring-4 ring-blue-400/60 border-blue-600 shadow-2xl' : ''} ${dragSlot != null && dragSlot.employeeId === employee.id && dragSlot.day === day && dragSlot.slotIndex === slotIndex ? 'ring-4 ring-green-400/60 border-green-600 shadow-2xl opacity-90' : ''}`}
                                          style={{
                                            top: dragSlot != null && dragSlot.employeeId === employee.id && dragSlot.day === day && dragSlot.slotIndex === slotIndex && dragGhostTime ? `calc(${((Number(dragGhostTime.split(':')[0]) + Number(dragGhostTime.split(':')[1]) / 60 - 8) / 14) * 100}% )` : top,
                                            height: `calc(${height} - 4px)`,
                                            width,
                                            left,
                                            zIndex: (slotColumn || 0) + 1,
                                            maxWidth: '100%',
                                            margin: 0,
                                            background: hatch,
                                            color: textColor,
                                            border: border,
                                            opacity: opacity,
                                            transition: 'height 0.15s cubic-bezier(.4,2,.6,1), top 0.1s cubic-bezier(.4,2,.6,1)',
                                            boxShadow: dragSlot != null && dragSlot.employeeId === employee.id && dragSlot.day === day && dragSlot.slotIndex === slotIndex ? '0 8px 32px #22c55e44' : undefined,
                                            pointerEvents: slot.type !== 'work' ? 'none' : (resizeSlot ? 'none' : undefined),
                                            cursor: slot.type !== 'work' ? 'default' : (dragSlot != null && dragSlot.employeeId === employee.id && dragSlot.day === day && dragSlot.slotIndex === slotIndex ? 'grabbing' : 'grab'),
                                            userSelect: 'none',
                                          }}
                                          title={isWork ? employee.name : `${employee.name} - ${slotTypeConfig[slot.type as keyof typeof slotTypeConfig].label}`}
                                          onMouseDown={e => {
                                            // Drag uniquement si pas sur un handle
                                            if (!(e.target as HTMLElement).classList.contains('resize-handle')) {
                                              e.stopPropagation();
                                              const slotStartY = e.currentTarget.getBoundingClientRect().top;
                                              dragOffsetRef.current = e.clientY - slotStartY;
                                              const duration = (Number(slot.end.split(':')[0]) * 60 + Number(slot.end.split(':')[1])) - (Number(slot.start.split(':')[0]) * 60 + Number(slot.start.split(':')[1]));
                                              setDragSlot({ employeeId: employee.id, day, slotIndex, duration, originalStart: slot.start });
                                              setDragGhostTime(slot.start);
                                            }
                                          }}
                                        >
                                          {/* Aperçu horaire pendant le drag */}
                                          {dragSlot != null && dragSlot.employeeId === employee.id && dragSlot.day === day && dragSlot.slotIndex === slotIndex && dragGhostTime && (
                                            (() => {
                                              // Calcule l'heure de fin
                                              const [sh, sm] = dragGhostTime.split(':').map(Number);
                                              const startMinutes = sh * 60 + sm;
                                              const endMinutes = startMinutes + dragSlot.duration;
                                              const eh = Math.floor(endMinutes / 60);
                                              const em = endMinutes % 60;
                                              const preview = `${dragGhostTime} - ${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;
                                              return (
                                                <div
                                                  style={{
                                                    ...previewLabelStyle,
                                                    top: `calc(50% - 18px)`
                                                  }}
                                                >
                                                  {preview}
                                                </div>
                                              );
                                            })()
                                          )}
                                          {/* Handle haut */}
                                          <div
                                            className="resize-handle"
                                            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, cursor: 'ns-resize', zIndex: 10 }}
                                            onMouseDown={e => {
                                              e.stopPropagation();
                                              setResizeSlot({ employeeId: employee.id, day, slotIndex, type: 'start' });
                                              setResizeValue(slot.start);
                                            }}
                                          />
                                          {/* Ligne ghost et label d'heure pour le handle haut */}
                                          {resizeSlot && resizeSlot.employeeId === employee.id && resizeSlot.day === day && resizeSlot.slotIndex === slotIndex && resizeSlot.type === 'start' && resizeValue && (
                                            <>
                                              <div
                                                style={{
                                                  ...ghostLineStyle,
                                                  top: 0,
                                                  transform: `translateY(calc(${((Number(resizeValue.split(':')[0]) + Number(resizeValue.split(':')[1]) / 60 - 8) / 14) * 100}%))`,
                                                  background: '#2563eb',
                                                }}
                                              />
                                              <div
                                                style={{
                                                  ...ghostLabelStyle,
                                                  top: `calc(${((Number(resizeValue.split(':')[0]) + Number(resizeValue.split(':')[1]) / 60 - 8) / 14) * 100}% - 12px)`
                                                }}
                                              >
                                                {resizeValue}
                                              </div>
                                            </>
                                          )}
                                          {slot.type !== 'work' ? (
                                            <span className="w-full text-center truncate" style={{ userSelect: 'none' }}>{employee.name}</span>
                                          ) : (
                                            <>
                                              <span className="w-full text-center truncate" style={{ userSelect: 'none' }}>{employee.name}</span>
                                              <span className="text-xs opacity-80" style={{ userSelect: 'none' }}>{displayStart} - {displayEnd} {holidayName && slot.type === 'work' && <span className="text-red-600 font-bold">(férié travaillé)</span>}</span>
                                              {/* Handles, drag, etc. ici uniquement pour work */}
                                            </>
                                          )}
                                          {/* Handle bas */}
                                          <div
                                            className="resize-handle"
                                            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 8, cursor: 'ns-resize', zIndex: 10 }}
                                            onMouseDown={e => {
                                              e.stopPropagation();
                                              setResizeSlot({ employeeId: employee.id, day, slotIndex, type: 'end' });
                                              setResizeValue(slot.end);
                                            }}
                                          />
                                          {/* Ligne ghost et label d'heure pour le handle bas */}
                                          {resizeSlot && resizeSlot.employeeId === employee.id && resizeSlot.day === day && resizeSlot.slotIndex === slotIndex && resizeSlot.type === 'end' && resizeValue && (
                                            <>
                                              <div
                                                style={{
                                                  ...ghostLineStyle,
                                                  bottom: 0,
                                                  transform: `translateY(calc(${((Number(resizeValue.split(':')[0]) + Number(resizeValue.split(':')[1]) / 60 - 8) / 14) * 100}%))`,
                                                  background: '#2563eb',
                                                }}
                                              />
                                              <div
                                                style={{
                                                  ...ghostLabelStyle,
                                                  top: `calc(${((Number(resizeValue.split(':')[0]) + Number(resizeValue.split(':')[1]) / 60 - 8) / 14) * 100}% - 12px)`
                                                }}
                                              >
                                                {resizeValue}
                                              </div>
                                            </>
                                          )}
                                          {/* Icône poubelle au hover */}
                                          <button
                                            type="button"
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              const slots = getEmployeeScheduleForDay(employee.id, day);
                                              const newSlots = [...slots];
                                              newSlots.splice(slotIndex, 1);
                                              await updateLocalSchedule(employee.id, day, newSlots);
                                              toast({ title: 'Créneau supprimé' });
                                            }}
                                            style={{
                                              position: 'absolute',
                                              top: 2,
                                              right: 2,
                                              zIndex: 50,
                                              background: 'rgba(255,255,255,0.7)',
                                              borderRadius: 4,
                                              // display: 'none', // SUPPRIMÉ
                                            }}
                                            className="hidden group-hover:inline-block hover:bg-red-100"
                                          >
                                            <Trash2 className="h-4 w-4 text-red-600" />
                                          </button>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        {/* Séparateur visuel */}
                        <div className="my-4 border-t border-border" />
                        {/* Weekend */}
                        <div>
                          <div className="font-bold text-lg mb-1">Weekend (samedi & dimanche)</div>
                          <div className="grid grid-cols-[50px_repeat(2,minmax(180px,1fr))] gap-1 mb-2 sticky top-0 bg-background z-10 w-full">
                            <div className="p-2 text-center font-medium text-muted-foreground text-lg"></div>
                            {daysOfWeek.slice(5, 7).map((day, index) => (
                              <div key={day} className="p-2 text-center font-bold bg-muted rounded text-lg truncate flex flex-col items-center">
                                <div className="font-bold">{day}</div>
                                <div className="text-base text-muted-foreground">{formatDate(currentWeekDates[5 + index])}</div>
                                {/* Sélecteur de personne en charge pour le weekend */}
                                <Select
                                  value={(() => {
                                    // Trouver l'employé en charge pour ce jour
                                    const found = employees.find(emp => {
                                      const slots = getEmployeeScheduleForDay(emp.id, day);
                                      return slots && slots.length > 0 && slots.some(slot => slot.type === 'work');
                                    });
                                    return found ? found.id : 'none';
                                  })()}
                                  onValueChange={empId => handleSaturdayEmployeeChange(empId === 'none' ? '' : empId, day)}
                                >
                                  <SelectTrigger className="mt-1 w-full max-w-[160px] mx-auto">
                                    <SelectValue placeholder="Choisir..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none" className="flex items-center gap-2 text-muted-foreground">
                                      <span className="w-3 h-3 rounded-full inline-block mr-2 bg-gray-300" />
                                      Aucune (retirer)
                                    </SelectItem>
                                    {employees.map(emp => (
                                      <SelectItem key={emp.id} value={emp.id} className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full inline-block mr-2" style={{ backgroundColor: emp.color }} />
                                        {emp.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-[50px_repeat(2,minmax(180px,1fr))] gap-1 w-full">
                            <div className="space-y-1">
                              {hours.map((hour) => (
                                <div key={hour} className="h-16 p-2 text-center text-base text-muted-foreground font-semibold w-[50px] min-w-[50px] max-w-[50px]">
                                  {hour}h
                                </div>
                              ))}
                            </div>
                            {daysOfWeek.slice(5, 7).map((day, i) => (
                              <div key={day} className="relative space-y-1 overflow-visible min-w-[180px]" id={`day-grid-${day}`}>
                                {hours.map((hour) => (
                                  <div
                                    key={hour}
                                    className="h-16 border border-border rounded hover:bg-muted/50 transition-colors"
                                  />
                                ))}
                                {/* Créneaux */}
                                {(() => {
                                  const daySlots = getOverlappingTimeSlots(day);
                                  const { stacked, maxOverlap } = getStackedSlots(daySlots);
                                  return stacked.map(({ employee, slot, startHour, endHour, slotColumn }, index) => {
                                    const isAbsence = slot.type !== 'work';
                                    const { top, height } = getTimeSlotPosition(
                                      slot.type !== 'work' ? '08:00' : slot.start,
                                      slot.type !== 'work' ? '22:00' : slot.end
                                    );
                                    const isWork = slot.type === 'work';
                                    // Style spécial pour absences
                                    let absenceBg = 'repeating-linear-gradient(135deg, #cbd5e1 0px, #cbd5e1 10px, #f1f5f9 10px, #f1f5f9 20px)';
                                    let absenceBorder = '2px solid #64748b';
                                    let absenceOpacity = 0.85;
                                    const bgColor = employee.color || '#8884d8';
                                    const textColor = getContrastYIQ(bgColor);
                                    const hatch = !isWork ? absenceBg : bgColor;
                                    const border = !isWork ? absenceBorder : `2px solid ${bgColor}`;
                                    const opacity = !isWork ? absenceOpacity : 1;
                                    const width = `calc(${100 / maxOverlap}% - 4px)`;
                                    const left = `calc(${(slotColumn || 0) * 100 / maxOverlap}% + 2px)`;
                                    // Identifiant unique du slot
                                    const slotIndex = getEmployeeScheduleForDay(employee.id, day).findIndex(s => s.start === slot.start && s.end === slot.end && s.type === slot.type);
                                    // Affichage temporaire pendant le drag
                                    let displayStart = slot.start;
                                    let displayEnd = slot.end;
                                    if (resizeSlot && resizeSlot.employeeId === employee.id && resizeSlot.day === day && resizeSlot.slotIndex === slotIndex) {
                                      if (resizeSlot.type === 'start' && resizeValue) displayStart = resizeValue < slot.end ? resizeValue : slot.start;
                                      if (resizeSlot.type === 'end' && resizeValue) displayEnd = resizeValue > slot.start ? resizeValue : slot.end;
                                    }
                                    // Correction : holidayName doit être défini ici pour chaque slot
                                    const dayIndex = daysOfWeek.indexOf(day);
                                    const dateStr = dayIndex !== -1 && currentWeekDates[dayIndex] ? currentWeekDates[dayIndex].toISOString().slice(0, 10) : null;
                                    const holidayName = dateStr ? holidays[dateStr] : undefined;
                                    return (
                                      <div
                                        key={`${employee.id}-${slot.start}-${slot.end}`}
                                        ref={el => {
                                          if (resizeSlot != null && resizeSlot.employeeId === employee.id && resizeSlot.day === day && resizeSlot.slotIndex === slotIndex) {
                                            slotDragRef.current = el;
                                          }
                                        }}
                                        className={`absolute rounded-lg shadow-lg p-1 text-sm font-bold flex flex-col items-center justify-center transition-all duration-200 hover:scale-[1.03] group ${resizeSlot != null && resizeSlot.employeeId === employee.id && resizeSlot.day === day && resizeSlot.slotIndex === slotIndex ? 'ring-4 ring-blue-400/60 border-blue-600 shadow-2xl' : ''} ${dragSlot != null && dragSlot.employeeId === employee.id && dragSlot.day === day && dragSlot.slotIndex === slotIndex ? 'ring-4 ring-green-400/60 border-green-600 shadow-2xl opacity-90' : ''}`}
                                        style={{
                                          top: dragSlot != null && dragSlot.employeeId === employee.id && dragSlot.day === day && dragSlot.slotIndex === slotIndex && dragGhostTime ? `calc(${((Number(dragGhostTime.split(':')[0]) + Number(dragGhostTime.split(':')[1]) / 60 - 8) / 14) * 100}% )` : top,
                                          height: `calc(${height} - 4px)`,
                                          width,
                                          left,
                                          zIndex: (slotColumn || 0) + 1,
                                          maxWidth: '100%',
                                          margin: 0,
                                          background: hatch,
                                          color: textColor,
                                          border: border,
                                          opacity: opacity,
                                          transition: 'height 0.15s cubic-bezier(.4,2,.6,1), top 0.1s cubic-bezier(.4,2,.6,1)',
                                          boxShadow: dragSlot != null && dragSlot.employeeId === employee.id && dragSlot.day === day && dragSlot.slotIndex === slotIndex ? '0 8px 32px #22c55e44' : undefined,
                                          pointerEvents: slot.type !== 'work' ? 'none' : (resizeSlot ? 'none' : undefined),
                                          cursor: slot.type !== 'work' ? 'default' : (dragSlot != null && dragSlot.employeeId === employee.id && dragSlot.day === day && dragSlot.slotIndex === slotIndex ? 'grabbing' : 'grab'),
                                          userSelect: 'none',
                                        }}
                                        title={isWork ? employee.name : `${employee.name} - ${slotTypeConfig[slot.type as keyof typeof slotTypeConfig].label}`}
                                        onMouseDown={e => {
                                          // Drag uniquement si pas sur un handle
                                          if (!(e.target as HTMLElement).classList.contains('resize-handle')) {
                                            e.stopPropagation();
                                            const slotStartY = e.currentTarget.getBoundingClientRect().top;
                                            dragOffsetRef.current = e.clientY - slotStartY;
                                            const duration = (Number(slot.end.split(':')[0]) * 60 + Number(slot.end.split(':')[1])) - (Number(slot.start.split(':')[0]) * 60 + Number(slot.start.split(':')[1]));
                                            setDragSlot({ employeeId: employee.id, day, slotIndex, duration, originalStart: slot.start });
                                            setDragGhostTime(slot.start);
                                          }
                                        }}
                                      >
                                        {/* Aperçu horaire pendant le drag */}
                                        {dragSlot != null && dragSlot.employeeId === employee.id && dragSlot.day === day && dragSlot.slotIndex === slotIndex && dragGhostTime && (
                                          (() => {
                                            // Calcule l'heure de fin
                                            const [sh, sm] = dragGhostTime.split(':').map(Number);
                                            const startMinutes = sh * 60 + sm;
                                            const endMinutes = startMinutes + dragSlot.duration;
                                            const eh = Math.floor(endMinutes / 60);
                                            const em = endMinutes % 60;
                                            const preview = `${dragGhostTime} - ${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;
                                            return (
                                              <div
                                                style={{
                                                  ...previewLabelStyle,
                                                  top: `calc(50% - 18px)`
                                                }}
                                              >
                                                {preview}
                                              </div>
                                            );
                                          })()
                                        )}
                                        {/* Handle haut */}
                                        <div
                                          className="resize-handle"
                                          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, cursor: 'ns-resize', zIndex: 10 }}
                                          onMouseDown={e => {
                                            e.stopPropagation();
                                            setResizeSlot({ employeeId: employee.id, day, slotIndex, type: 'start' });
                                            setResizeValue(slot.start);
                                          }}
                                        />
                                        {/* Ligne ghost et label d'heure pour le handle haut */}
                                        {resizeSlot && resizeSlot.employeeId === employee.id && resizeSlot.day === day && resizeSlot.slotIndex === slotIndex && resizeSlot.type === 'start' && resizeValue && (
                                          <>
                                            <div
                                              style={{
                                                ...ghostLineStyle,
                                                top: 0,
                                                transform: `translateY(calc(${((Number(resizeValue.split(':')[0]) + Number(resizeValue.split(':')[1]) / 60 - 8) / 14) * 100}%))`,
                                                background: '#2563eb',
                                              }}
                                            />
                                            <div
                                              style={{
                                                ...ghostLabelStyle,
                                                top: `calc(${((Number(resizeValue.split(':')[0]) + Number(resizeValue.split(':')[1]) / 60 - 8) / 14) * 100}% - 12px)`
                                              }}
                                            >
                                              {resizeValue}
                                            </div>
                                          </>
                                        )}
                                        {slot.type !== 'work' ? (
                                          <span className="w-full text-center truncate" style={{ userSelect: 'none' }}>{employee.name}</span>
                                        ) : (
                                          <>
                                            <span className="w-full text-center truncate" style={{ userSelect: 'none' }}>{employee.name}</span>
                                            <span className="text-xs opacity-80" style={{ userSelect: 'none' }}>{displayStart} - {displayEnd} {holidayName && slot.type === 'work' && <span className="text-red-600 font-bold">(férié travaillé)</span>}</span>
                                            {/* Handles, drag, etc. ici uniquement pour work */}
                                          </>
                                        )}
                                        {/* Handle bas */}
                                        <div
                                          className="resize-handle"
                                          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 8, cursor: 'ns-resize', zIndex: 10 }}
                                          onMouseDown={e => {
                                            e.stopPropagation();
                                            setResizeSlot({ employeeId: employee.id, day, slotIndex, type: 'end' });
                                            setResizeValue(slot.end);
                                          }}
                                        />
                                        {/* Ligne ghost et label d'heure pour le handle bas */}
                                        {resizeSlot && resizeSlot.employeeId === employee.id && resizeSlot.day === day && resizeSlot.slotIndex === slotIndex && resizeSlot.type === 'end' && resizeValue && (
                                          <>
                                            <div
                                              style={{
                                                ...ghostLineStyle,
                                                bottom: 0,
                                                transform: `translateY(calc(${((Number(resizeValue.split(':')[0]) + Number(resizeValue.split(':')[1]) / 60 - 8) / 14) * 100}%))`,
                                                background: '#2563eb',
                                              }}
                                            />
                                            <div
                                              style={{
                                                ...ghostLabelStyle,
                                                top: `calc(${((Number(resizeValue.split(':')[0]) + Number(resizeValue.split(':')[1]) / 60 - 8) / 14) * 100}% - 12px)`
                                              }}
                                            >
                                              {resizeValue}
                                            </div>
                                          </>
                                        )}
                                        {/* Icône poubelle au hover */}
                                        <button
                                          type="button"
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            const slots = getEmployeeScheduleForDay(employee.id, day);
                                            const newSlots = [...slots];
                                            newSlots.splice(slotIndex, 1);
                                            await updateLocalSchedule(employee.id, day, newSlots);
                                            toast({ title: 'Créneau supprimé' });
                                          }}
                                          style={{
                                            position: 'absolute',
                                            top: 2,
                                            right: 2,
                                            zIndex: 50,
                                            background: 'rgba(255,255,255,0.7)',
                                            borderRadius: 4,
                                            // display: 'none', // SUPPRIMÉ
                                          }}
                                          className="hidden group-hover:inline-block hover:bg-red-100"
                                        >
                                          <Trash2 className="h-4 w-4 text-red-600" />
                                        </button>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
            {viewMode === 'person' && (
              <div className="p-6 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Vue par personne</h2>
                  <WeekSelector
                    currentWeekOffset={currentWeekOffset}
                    setCurrentWeekOffset={setCurrentWeekOffset}
                    currentWeekDates={currentWeekDates}
                    weekNumber={weekNumber}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {employees.map((employee) => (
                    <div key={employee.id} className="bg-background rounded-lg shadow p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={`https://avatar.vercel.sh/${employee.id}.png`} alt={employee.name} />
                          <AvatarFallback className="text-lg">{employee.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-bold text-lg">{employee.name}</div>
                          <div className="text-sm text-muted-foreground">{employee.role}</div>
                        </div>
                      </div>
                      <div className="space-y-2 mt-2">
                        {daysOfWeek.map((day, i) => {
                          const slots = getEmployeeScheduleForDay(employee.id, day);
                          return (
                            <div key={day} className="flex items-center gap-2">
                              <span className="w-20 font-medium">{day}</span>
                              {slots.length === 0 ? (
                                <span className="text-muted-foreground">Repos</span>
                              ) : (
                                slots.map((slot, idx) => (
                                  <span key={idx} className={`px-2 py-1 rounded text-xs font-bold ${slotTypeConfig[slot.type].bgColor} ${slotTypeConfig[slot.type].textColor} border ${slotTypeConfig[slot.type].borderColor}`}>{slotTypeConfig[slot.type].label} {slot.start}-{slot.end}</span>
                                ))
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {viewMode === 'slot' && (
              <div className="p-6 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Vue par créneau</h2>
                  <WeekSelector
                    currentWeekOffset={currentWeekOffset}
                    setCurrentWeekOffset={setCurrentWeekOffset}
                    currentWeekDates={currentWeekDates}
                    weekNumber={weekNumber}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {daysOfWeek.map((day, i) => {
                    const slots = getOverlappingTimeSlots(day);
                    return (
                      <div key={day} className="bg-background rounded-lg shadow p-4">
                        <div className="font-bold text-lg mb-2">{day} ({formatDate(currentWeekDates[i])})</div>
                        {slots.length === 0 ? (
                          <span className="text-muted-foreground">Aucun créneau</span>
                        ) : (
                          slots.map(({ employee, slot }, idx) => (
                            <div key={idx} className="flex items-center gap-2 mb-1">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={`https://avatar.vercel.sh/${employee.id}.png`} alt={employee.name} />
                                <AvatarFallback className="text-xs">{employee.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
                              </Avatar>
                              <span className="font-bold">{employee.name}</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${slotTypeConfig[slot.type].bgColor} ${slotTypeConfig[slot.type].textColor} border ${slotTypeConfig[slot.type].borderColor}`}>{slotTypeConfig[slot.type].label}</span>
                              <span className="text-xs opacity-80">{slot.start} - {slot.end}</span>
                            </div>
                          ))
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="management">
            <EmployeeManagementView
              employees={employees}
              currentWeekKey={currentWeekKey}
              currentWeekDates={currentWeekDates}
              weekNumber={weekNumber}
              daysOfWeek={daysOfWeek}
              getTotalHoursForWeek={getTotalHoursForWeek}
              updateLocalSchedule={updateLocalSchedule}
              getEmployeeScheduleForDay={getEmployeeScheduleForDay}
              slotTypeConfig={slotTypeConfig}
              currentWeekOffset={currentWeekOffset}
              setCurrentWeekOffset={setCurrentWeekOffset}
              setSchedules={setSchedules}
              setEmployees={setEmployees}
              reloadSchedules={(window as any).reloadSchedules}
            />
          </TabsContent>

          <TabsContent value="table">
            <TableView />
          </TabsContent>
        </Tabs>
    </div>
  )
}
