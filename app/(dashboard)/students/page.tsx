import { StudentsDataTable } from "@/components/students-data-table"
import { getStudents } from "@/lib/db/services/students"
import promos from "config/promoConfig.json" assert { type: "json" }
import { Student } from '@/components/students/student-detail-viewer';

interface Promo {
  key: string
  eventId: number
  title: string
}

interface StudentsPageProps {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function StudentsPage({ searchParams }: StudentsPageProps) {
  const resolvedParams = await searchParams
  const { q = "", offset = "0", promo = "", status = "", delay_level = "" } = resolvedParams

  const search = q
  const offsetNumber = Number(offset)

  // Trouver la promo sélectionnée
  const selectedPromo = promos.find((p) => p.key === promo)
  const eventId: string = selectedPromo ? String(selectedPromo.eventId) : ""

  // Appel au backend pour récupérer les données des étudiants
  const { students, newOffset, totalStudents, previousOffset, currentOffset } = await getStudents(
    search,
    offsetNumber,
    promo,
    status,
    delay_level,
    null,
    null,
  )

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <StudentsDataTable
        data={students as unknown as Student[]}
        promos={promos}
        currentOffset={currentOffset ?? 0}
        newOffset={newOffset}
        totalStudents={totalStudents}
        previousOffset={previousOffset}
        search={search}
        promo={promo}
        eventId={eventId}
        currentStatus={status}
        currentDelayLevel={delay_level}
      />
    </div>
  );
}
