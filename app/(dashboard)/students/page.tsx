import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getStudents } from '@/lib/db';
import { StudentsTable } from '../students-table';
import promos from 'config/promoConfig.json' assert { type: 'json' };
import ClientImport from '@/components/clien-import';
import AddStudent from '@/components/add-student'; // Import tel quel du tableau

interface Promo {
  key: string;
  eventId: number;
  title: string;
}


interface StudentsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function StudentsPage({ searchParams }: StudentsPageProps) {
  const resolvedParams = await searchParams;
  const { q = '', offset = '0', promo = '' } = resolvedParams;
  const search = q;
  const offsetNumber = Number(offset);

  console.log('Promo:', promo);

  // Trouver la promo sélectionnée
  const selectedPromo = promos.find((p) => p.key === promo);
  const eventId: string = selectedPromo ? String(selectedPromo.eventId) : '';

  // Appel au backend pour récupérer les données des étudiants
  const { students, newOffset, totalStudents, previousOffset, currentOffset } =
    await getStudents(search, offsetNumber, promo, '', '', null);

  return (
    <Tabs value={promo || 'all'}>
      <div className="flex items-center">
        <TabsList>
          <TabsTrigger value="all">
            <div className="relative group">
              <a
                href={`/students?q=${search}&offset=${0}`}
                className="transition-all duration-300 hover:text-blue-600"
              >
                Toutes les promotions
              </a>
            </div>
          </TabsTrigger>
          {promos.map(({ key, title }) => (
            <TabsTrigger key={key} value={key}>
              <div className="relative group">
                <a
                  href={`/students?q=${search}&offset=${0}&promo=${encodeURIComponent(key)}`}
                  className="transition-all duration-300 hover:text-blue-600"
                >
                  {key}
                </a>
              </div>
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
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}