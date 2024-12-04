import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getStudents } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { StudentsTable } from '../students-table';

const promos = ['all', 'P1 2022', 'P1 2023', 'P2 2023', 'P1 2024'];

export default async function StudentsPage(props: {
  searchParams: { q?: string | undefined; offset?: string | undefined; promo?: string | undefined; };
}) {
  // Récupérer les paramètres de recherche
  const { q = '', offset = '0', promo = 'all' } = props.searchParams;

  // Convertir l'offset en nombre
  const offsetNumber = isNaN(Number(offset)) ? 0 : Number(offset); // Assurer que l'offset est un nombre valide

  // Appel au backend pour récupérer les données des étudiants
  const { students, newOffset, totalStudents, previousOffset, currentOffset } =
    await getStudents(q, offsetNumber, promo);

  return (
    <Tabs value={promo}>
      <div className="flex items-center">
        <TabsList>
          {promos.map((promoValue) => (
            <TabsTrigger key={promoValue} value={promoValue}>
              <a href={`/students?q=${q}&offset=0&promo=${promoValue}`} className="">
                {promoValue === 'all' ? 'All' : promoValue}
              </a>
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1">
            Export
          </Button>
          <Button size="sm" className="h-8 gap-1">
            Add Student
          </Button>
        </div>
      </div>

      {/* Affichage dynamique des contenus des onglets */}
      {promos.map((promoValue) => (
        <TabsContent key={promoValue} value={promoValue}>
          <StudentsTable
            students={students}
            currentOffset={currentOffset ?? 0}
            newOffset={newOffset}
            totalStudents={totalStudents}
            previousOffset={previousOffset}
            search={q}
            promo={promoValue}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}