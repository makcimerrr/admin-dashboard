import { Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getStudents } from '@/lib/db/services/students';
import { StudentsTable } from '../students-table';
import promos from 'config/promoConfig.json' assert { type: 'json' };
import TrackStatsDisplay from '@/components/track-stats-display';
import { Users, GraduationCap } from 'lucide-react';
import { StudentsHeader } from './_components/students-header';
import { QuickStats } from './_components/quick-stats';
import { Skeleton } from '@/components/ui/skeleton';

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

// Loading skeleton for stats
function StatsLoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-3 border rounded-lg">
          <div className="flex justify-between items-center">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-6 w-6 rounded" />
          </div>
          <Skeleton className="h-8 w-16 mt-2" />
        </div>
      ))}
    </div>
  );
}

export default async function StudentsPage({ searchParams }: StudentsPageProps) {
  const resolvedParams = await searchParams;
  const {
    q = '',
    offset = '0',
    promo = '',
    filter = '',
    direction = '',
    status = null,
    delay_level = null,
    track = null,
    track_completed = null,
    dropout_filter = 'active'
  } = resolvedParams;

  const search = q;
  const offsetNumber = Number(offset);

  // Find selected promo
  const selectedPromo = promos.find((p) => p.key === promo);
  const eventId: string = selectedPromo ? String(selectedPromo.eventId) : '';

  // Fetch students data
  const { students, newOffset, totalStudents, previousOffset, currentOffset } =
    await getStudents(
      search,
      offsetNumber,
      promo,
      filter,
      direction,
      status,
      delay_level,
      track,
      track_completed
    );

  // Fetch stats for all students (for header display)
  const allStudentsData = await getStudents('', 0, promo, '', '', null, null, null, null, -1, 'all');
  const activeStudentsData = await getStudents('', 0, promo, '', '', null, null, null, null, -1, 'active');

  const totalAll = allStudentsData.totalStudents;
  const totalActive = activeStudentsData.totalStudents;
  const totalDropout = totalAll - totalActive;

  return (
    <div className="page-container flex flex-col gap-4 md:gap-6 p-4 md:p-6">
      {/* Header with stats */}
      <StudentsHeader
        totalStudents={totalAll}
        activeStudents={totalActive}
        dropoutStudents={totalDropout}
      />

      {/* Quick Stats Cards */}
      <QuickStats
        totalStudents={totalAll}
        activeStudents={totalActive}
        dropoutStudents={totalDropout}
      />

      {/* Track Statistics */}
      <Suspense fallback={<StatsLoadingSkeleton />}>
        <TrackStatsDisplay selectedPromo={promo || 'all'} />
      </Suspense>

      {/* Promo Tabs + Table */}
      <Tabs value={promo || 'all'} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
          <TabsList className="w-full sm:w-auto overflow-x-auto flex-shrink-0">
            <TabsTrigger value="all" asChild>
              <a
                href={`/students?q=${search}&offset=${0}`}
                className="gap-2 inline-flex items-center"
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
        </div>

        <TabsContent value="all" className="mt-0">
          <StudentsTable
            students={students}
            currentOffset={currentOffset ?? 0}
            newOffset={newOffset}
            totalStudents={totalStudents}
            previousOffset={previousOffset}
            search={search}
            promo={promo}
            eventId="all"
            promoConfig={promos as Promo[]}
          />
        </TabsContent>

        {promos.map(({ key, title }) => (
          <TabsContent key={key} value={key} className="mt-0">
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
