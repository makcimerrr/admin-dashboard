'use client';

import {
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  Table
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Student } from './student';
import { SelectStudent } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';

export function StudentsTable({
  students,
  currentOffset,
  newOffset,
  previousOffset,
  totalStudents,
  search,
  promo
}: {
  students: SelectStudent[];
  currentOffset: number | null;
  newOffset: number | null;
  previousOffset: number | null;
  totalStudents: number;
  search: string;
  promo: string;
}) {
  const router = useRouter();
  const studentsPerPage = 5;

  /*useEffect(() => {
    console.log('Frontend - Offset actuel:', currentOffset);
    console.log('Frontend - newOffset:', newOffset);
    console.log('Frontend - previousOffset:', previousOffset);
  }, []);*/

  function prevPage() {
    if (previousOffset !== null) {
      const query = new URLSearchParams({ q: search, offset: String(previousOffset), promo });
      router.push(`/students?${query.toString()}`, { scroll: false });
    }
  }
  function nextPage() {
    if (newOffset !== null) {
      const query = new URLSearchParams({ q: search, offset: String(newOffset), promo });
      router.push(`/students?${query.toString()}`, { scroll: false });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Students</CardTitle>
        <CardDescription>
          Manage your students and view their details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>First Name</TableHead>
              <TableHead>Last Name</TableHead>
              <TableHead>Login</TableHead>
              <TableHead>Promo</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Retard</TableHead>
              <TableHead className="hidden md:table-cell">
                Available At
              </TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <Student key={student.id} student={student} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <div className="flex w-full justify-between items-center">
          {/* Afficher les indices des étudiants affichés */}
          <div className="text-xs text-muted-foreground">
            Showing{' '}
            <strong>
              {currentOffset !== null ? currentOffset + 1 : 0}-
              {currentOffset !== null
                ? Math.min(currentOffset + studentsPerPage, totalStudents)
                : 0}
            </strong>{' '}
            of <strong>{totalStudents}</strong> students
          </div>

          {/* Boutons de pagination */}
          <div className="flex">
            <Button
              onClick={prevPage}
              variant="ghost"
              size="sm"
              disabled={previousOffset === null}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Prev
            </Button>
            <Button
              onClick={nextPage}
              variant="ghost"
              size="sm"
              disabled={newOffset === null}
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
