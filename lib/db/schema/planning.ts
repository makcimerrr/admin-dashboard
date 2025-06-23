// Schéma et types pour les plannings
export interface TimeSlot {
  id?: string
  start: string
  end: string
  isWorking: boolean
  type: "work" | "vacation" | "sick" | "personal"
  note?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface Schedule {
  id: string
  employeeId: string
  weekKey: string
  day: string
  timeSlots: TimeSlot[]
  createdAt: Date
  updatedAt: Date
}

export interface CreateScheduleData {
  employeeId: string
  weekKey: string
  day: string
  timeSlots: Omit<TimeSlot, "id" | "createdAt" | "updatedAt">[]
}

export interface UpdateScheduleData {
  timeSlots: Omit<TimeSlot, "id" | "createdAt" | "updatedAt">[]
}

// Types de créneaux avec configuration
export const SLOT_TYPES = {
  work: {
    label: "Travail",
    isWorking: true,
    color: "blue",
    icon: "Clock",
  },
  vacation: {
    label: "Congés",
    isWorking: false,
    color: "orange",
    icon: "Plane",
  },
  sick: {
    label: "Arrêt maladie",
    isWorking: false,
    color: "red",
    icon: "AlertCircle",
  },
  personal: {
    label: "Personnel",
    isWorking: false,
    color: "purple",
    icon: "Coffee",
  },
} as const

export type SlotType = keyof typeof SLOT_TYPES

// Jours de la semaine
export const DAYS_OF_WEEK = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"] as const

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number]

// Validation des données de planning
export const validateScheduleData = (data: Partial<CreateScheduleData>): string[] => {
  const errors: string[] = []

  if (!data.employeeId) {
    errors.push("L'ID de l'employé est obligatoire")
  }

  if (!data.weekKey) {
    errors.push("La clé de semaine est obligatoire")
  }

  if (!data.day || !DAYS_OF_WEEK.includes(data.day as DayOfWeek)) {
    errors.push("Le jour doit être valide")
  }

  if (!data.timeSlots || !Array.isArray(data.timeSlots)) {
    errors.push("Les créneaux horaires sont obligatoires")
  } else {
    data.timeSlots.forEach((slot, index) => {
      const slotErrors = validateTimeSlot(slot)
      slotErrors.forEach((error) => {
        errors.push(`Créneau ${index + 1}: ${error}`)
      })
    })
  }

  return errors
}

// Validation d'un créneau horaire
export const validateTimeSlot = (slot: Partial<TimeSlot>): string[] => {
  const errors: string[] = []

  if (!slot.start || !isValidTime(slot.start)) {
    errors.push("L'heure de début est invalide")
  }

  if (!slot.end || !isValidTime(slot.end)) {
    errors.push("L'heure de fin est invalide")
  }

  if (slot.start && slot.end && slot.start >= slot.end) {
    errors.push("L'heure de fin doit être après l'heure de début")
  }

  if (!slot.type || !Object.keys(SLOT_TYPES).includes(slot.type)) {
    errors.push("Le type de créneau est invalide")
  }

  return errors
}

// Validation du format d'heure (HH:MM)
const isValidTime = (time: string): boolean => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  return timeRegex.test(time)
}

// Utilitaires pour les calculs de temps
export const calculateSlotDuration = (start: string, end: string): number => {
  const startMinutes = timeToMinutes(start)
  const endMinutes = timeToMinutes(end)
  return (endMinutes - startMinutes) / 60 // Retourne en heures
}

export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
}

// Fonction pour calculer le total d'heures travaillées
export const calculateTotalWorkHours = (timeSlots: TimeSlot[]): number => {
  return timeSlots
    .filter((slot) => slot.type === "work")
    .reduce((total, slot) => {
      return total + calculateSlotDuration(slot.start, slot.end)
    }, 0)
}

// Fonction pour détecter les conflits d'horaires
export const detectTimeConflicts = (timeSlots: TimeSlot[]): boolean => {
  const workSlots = timeSlots.filter((slot) => slot.type === "work")

  for (let i = 0; i < workSlots.length; i++) {
    for (let j = i + 1; j < workSlots.length; j++) {
      const slot1 = workSlots[i]
      const slot2 = workSlots[j]

      const start1 = timeToMinutes(slot1.start)
      const end1 = timeToMinutes(slot1.end)
      const start2 = timeToMinutes(slot2.start)
      const end2 = timeToMinutes(slot2.end)

      // Vérifier le chevauchement
      if (start1 < end2 && start2 < end1) {
        return true
      }
    }
  }

  return false
}

// Modèles de créneaux prédéfinis
export const SCHEDULE_TEMPLATES = {
  fullDay: {
    name: "Journée complète",
    slots: [
      { start: "09:00", end: "12:00", type: "work" as SlotType, isWorking: true },
      { start: "13:00", end: "17:00", type: "work" as SlotType, isWorking: true },
    ],
  },
  morning: {
    name: "Matin",
    slots: [{ start: "09:00", end: "12:00", type: "work" as SlotType, isWorking: true }],
  },
  afternoon: {
    name: "Après-midi",
    slots: [{ start: "13:00", end: "17:00", type: "work" as SlotType, isWorking: true }],
  },
  vacation: {
    name: "Congés",
    slots: [{ start: "09:00", end: "17:00", type: "vacation" as SlotType, isWorking: false }],
  },
  sick: {
    name: "Arrêt maladie",
    slots: [{ start: "09:00", end: "17:00", type: "sick" as SlotType, isWorking: false }],
  },
} as const

export type ScheduleTemplate = keyof typeof SCHEDULE_TEMPLATES
