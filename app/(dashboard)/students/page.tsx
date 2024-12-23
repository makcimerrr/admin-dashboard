import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getStudents } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { StudentsTable } from '../students-table';
import Update from '@/components/update';

interface StudentsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function StudentsPage({ searchParams }: StudentsPageProps) {
  const resolvedParams = await searchParams;
  const { q = '', offset = '0', promo = '' } = resolvedParams;
  const search = q;
  const offsetNumber = Number(offset);

  console.log('Promo:', promo);

  // Mapping promo to eventId
  const promoEventIds: Record<string, number> = {
    'P1 2022': 32,
    'P1 2023': 148,
    'P2 2023': 216,
    'P1 2024': 303,
  };

  // EventId for the selected promo
  const eventId: string = String(promoEventIds[promo] || '');

  // Appel au backend pour récupérer les données des étudiants
  const { students, newOffset, totalStudents, previousOffset, currentOffset } =
    await getStudents(search, offsetNumber, promo);

  // @ts-ignore
  return (
    <Tabs value={promo || 'all'}>
      <div className="flex items-center">
        <TabsList>
          <TabsTrigger value="all">
            <a href={`/students?q=${search}&offset=${0}`} className="">
              All
            </a>
          </TabsTrigger>
          <TabsTrigger value="P1 2022">
            <a href={`/students?q=${search}&offset=${0}&promo=P1+2022`} className="">
              P1 2022
            </a>
          </TabsTrigger>
          <TabsTrigger value="P1 2023">
            <a href={`/students?q=${search}&offset=${0}&promo=P1+2023`} className="">
              P1 2023
            </a>
          </TabsTrigger>
          <TabsTrigger value="P2 2023">
            <a href={`/students?q=${search}&offset=${0}&promo=P2+2023`} className="">
              P2 2023
            </a>
          </TabsTrigger>
          <TabsTrigger value="P1 2024">
            <a href={`/students?q=${search}&offset=${0}&promo=P1+2024`} className="">
              P1 2024
            </a>
          </TabsTrigger>
        </TabsList>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1">
            Export
          </Button>
          <Button size="sm" className="h-8 gap-1">
            Add Student
          </Button>
          {/* Conditionally passing eventId to Update component */}
          {promo === "" ? (
            <Update eventId="all" />
          ) : (
            <Update eventId={eventId} />
          )}
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
        />
      </TabsContent>
      <TabsContent value="P1 2022">
        <StudentsTable
          students={students}
          currentOffset={currentOffset ?? 0}
          newOffset={newOffset}
          totalStudents={totalStudents}
          previousOffset={previousOffset}
          search={search}
          promo="P1 2022"
        />
      </TabsContent>
      <TabsContent value="P1 2023">
        <StudentsTable
          students={students}
          currentOffset={currentOffset ?? 0}
          newOffset={newOffset}
          totalStudents={totalStudents}
          previousOffset={previousOffset}
          search={search}
          promo="P1 2023"
        />
      </TabsContent>
      <TabsContent value="P2 2023">
        <StudentsTable
          students={students}
          currentOffset={currentOffset ?? 0}
          newOffset={newOffset}
          totalStudents={totalStudents}
          previousOffset={previousOffset}
          search={search}
          promo="P2 2023"
        />
      </TabsContent>
      <TabsContent value="P1 2024">
        <StudentsTable
          students={students}
          currentOffset={currentOffset ?? 0}
          newOffset={newOffset}
          totalStudents={totalStudents}
          previousOffset={previousOffset}
          search={search}
          promo="P1 2024"
        />
      </TabsContent>
    </Tabs>
  );
}