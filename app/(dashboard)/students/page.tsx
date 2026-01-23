import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getStudents } from '@/lib/db/services/students';
import { StudentsTable } from '../students-table';
import promos from 'config/promoConfig.json' assert { type: 'json' };
import ClientImport from '@/components/clien-import';
import AddStudent from '@/components/add-student';
import TrackStatsDisplay from '@/components/track-stats-display';
import { Users, GraduationCap } from 'lucide-react';

interface PromoDates {
  start: string;
  'piscine-js-start': string;
  'piscine-js-end': string;
  'piscine-rust-java-start': string;
  'piscine-rust-java-end': string;
  end: string;
}

interface Promo {
  key: string;
  eventId: number;
  title: string;
  dates: PromoDates;
}

interface StudentsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function StudentsPage({ searchParams }: StudentsPageProps) {
  const resolvedParams = await searchParams;
  const { q = '', offset = '0', promo = '', filter = '', direction = '', status = null, delay_level = null, track = null, track_completed = null } = resolvedParams;
  const search = q;
  const offsetNumber = Number(offset);

  // Trouver la promo sélectionnée
  const selectedPromo = promos.find((p) => p.key === promo);
  const eventId: string = selectedPromo ? String(selectedPromo.eventId) : '';

  // Appel au backend pour récupérer les données des étudiants
  const { students, newOffset, totalStudents, previousOffset, currentOffset } =
    await getStudents(search, offsetNumber, promo, filter, direction, status, delay_level, track, track_completed);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-lg">
          <GraduationCap className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des étudiants</h1>
          <p className="text-muted-foreground">
            Gérez et suivez les étudiants de toutes les promotions
          </p>
        </div>
      </div>

      {/* Track Statistics */}
      <TrackStatsDisplay selectedPromo={promo || 'all'} />

      <Tabs value={promo || 'all'} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <TabsList className="w-full sm:w-auto overflow-x-auto">
            <TabsTrigger value="all" asChild>
              <a
                href={`/students?q=${search}&offset=${0}`}
                className="gap-2"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Toutes les promotions</span>
                <span className="sm:hidden">Toutes</span>
              </a>
            </TabsTrigger>
            {promos.map(({ key, title }) => (
              <TabsTrigger key={key} value={key} asChild>
                <a
                  href={`/students?q=${search}&offset=${0}&promo=${encodeURIComponent(key)}`}
                >
                  {key}
                </a>
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="ml-auto flex items-center gap-2">
            <ClientImport />
            <AddStudent />
          </div>
        </div>

        <TabsContent value="all">
          <StudentsTable
            students={students}
            currentOffset={currentOffset ?? 0}
            newOffset={newOffset}
            totalStudents={totalStudents}
            previousOffset={previousOffset}
            search={search}
            promo={promo}
            eventId={"all"}
            promoConfig={promos as Promo[]}
          />
        </TabsContent>
        {promos.map(({ key, title }) => (
          <TabsContent key={key} value={key}>
            <StudentsTable
              students={students}
              currentOffset={currentOffset ?? 0}
              newOffset={newOffset}
              totalStudents={totalStudents}
              previousOffset={previousOffset}
              search={search}
              promo={key}
              eventId={String(promos.find((p) => p.key === key)?.eventId)}
              promoConfig={promos as Promo[]}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}