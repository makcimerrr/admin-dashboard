// Utilitaires pour les calculs de dates et semaines
export const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export const getWeekDates = (weekOffset = 0): Date[] => {
  const today = new Date()
  const currentDay = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - currentDay + 1 + weekOffset * 7)

  const weekDates = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    weekDates.push(date)
  }
  return weekDates
}

export const getWeekKey = (weekOffset: number): string => {
  const weekDates = getWeekDates(weekOffset)
  return `${weekDates[0].getFullYear()}-W${getWeekNumber(weekDates[0])}`
}

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  })
}

// Validation des données
export const validateEmployeeData = (
  data: Partial<{
    name: string
    role: string
    email: string
    color: string
  }>,
): string[] => {
  const errors: string[] = []

  if (!data.name || data.name.trim().length === 0) {
    errors.push("Le nom est obligatoire")
  }

  if (!data.role || data.role.trim().length === 0) {
    errors.push("Le poste est obligatoire")
  }

  if (data.email && !isValidEmail(data.email)) {
    errors.push("L'email n'est pas valide")
  }

  if (!data.color || !isValidColor(data.color)) {
    errors.push("La couleur est obligatoire")
  }

  return errors
}

export const validateTimeSlot = (slot: { start: string; end: string; type: string }) => {
  const errors: string[] = []

  // Validation du format des heures
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  if (!timeRegex.test(slot.start) || !timeRegex.test(slot.end)) {
    errors.push("Format d'heure invalide (utilisez HH:mm)")
  }

  // Validation de l'ordre des heures
  const startTime = new Date(`2000-01-01T${slot.start}`)
  const endTime = new Date(`2000-01-01T${slot.end}`)
  if (startTime >= endTime) {
    errors.push("L'heure de début doit être antérieure à l'heure de fin")
  }

  // Validation du type
  const validTypes = ["work", "vacation", "sick", "personal"]
  if (!validTypes.includes(slot.type)) {
    errors.push("Type de créneau invalide")
  }

  return errors
}

// Utilitaires de validation
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const isValidColor = (color: string): boolean => {
  const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
  return colorRegex.test(color)
}

const isValidTime = (time: string): boolean => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  return timeRegex.test(time)
}

// Couleurs prédéfinies pour les employés
export const EMPLOYEE_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#6366F1", // Indigo
  "#EC4899", // Pink
  "#14B8A6", // Teal
  "#F97316", // Orange
  "#84CC16", // Lime
] as const

// Fonction pour obtenir la prochaine couleur disponible
export const getNextAvailableColor = (existingColors: string[]): string => {
  for (const color of EMPLOYEE_COLORS) {
    if (!existingColors.includes(color)) {
      return color
    }
  }
  // Si toutes les couleurs sont utilisées, retourner une couleur aléatoire
  return EMPLOYEE_COLORS[Math.floor(Math.random() * EMPLOYEE_COLORS.length)]
}

// Calculs de temps
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
export const calculateTotalWorkHours = (timeSlots: { start: string; end: string; type: string }[]): number => {
  return timeSlots
    .filter((slot) => slot.type === "work")
    .reduce((total, slot) => {
      return total + calculateSlotDuration(slot.start, slot.end)
    }, 0)
}

// Fonction pour détecter les conflits d'horaires
export const detectTimeConflicts = (slots: { start: string; end: string }[]) => {
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const slot1 = slots[i]
      const slot2 = slots[j]

      const start1 = new Date(`2000-01-01T${slot1.start}`)
      const end1 = new Date(`2000-01-01T${slot1.end}`)
      const start2 = new Date(`2000-01-01T${slot2.start}`)
      const end2 = new Date(`2000-01-01T${slot2.end}`)

      if (
        (start1 >= start2 && start1 < end2) || // Le début du slot1 est dans le slot2
        (end1 > start2 && end1 <= end2) || // La fin du slot1 est dans le slot2
        (start1 <= start2 && end1 >= end2) // Le slot1 englobe le slot2
      ) {
        return true
      }
    }
  }
  return false
}
