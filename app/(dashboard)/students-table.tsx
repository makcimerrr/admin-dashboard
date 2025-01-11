"use client";

import { useState, useEffect } from 'react';
import {
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  Table,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Student } from './student';
import { SelectStudent } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Update from '@/components/update';

export function StudentsTable({
                                students,
                                currentOffset,
                                newOffset,
                                previousOffset,
                                totalStudents,
                                search,
                                promo,
                                eventId,
                              }: {
  students: SelectStudent[];
  currentOffset: number | null;
  newOffset: number | null;
  previousOffset: number | null;
  totalStudents: number;
  search: string;
  promo: string;
  eventId: string;
}) {
  const router = useRouter();
  const studentsPerPage = 20;
  const [studentsList, setStudentsList] = useState<SelectStudent[]>(students);
  const [isLoading, setIsLoading] = useState(false); // Pour gérer l'état de chargement
  const [filterStatus, setFilterStatus] = useState<string>(''); // Filter status state

  useEffect(() => {
    setStudentsList(students);
  }, [students]);

  const handleUpdate = () => {
    fetchStudents();
  };

  const fetchStudents = async () => {
    setIsLoading(true); // Activer le chargement
    try {
      const query = new URLSearchParams({ q: search, offset: String(newOffset), promo });
      const response = await fetch(`/api/get_students?${query.toString()}`);

      if (!response.ok) {
        throw new Error('Erreur de récupération des étudiants');
      }

      const data = await response.json();
      setStudentsList(data.students); // Mise à jour des étudiants
    } catch (error) {
      console.error('Erreur lors de la récupération des étudiants:', error);
    } finally {
      setIsLoading(false); // Désactivation du chargement une fois que tout est récupéré
    }
  };

  const prevPage = () => {
    if (previousOffset !== null) {
      const query = new URLSearchParams({ q: search, offset: String(previousOffset), promo });
      router.push(`/students?${query.toString()}`, { scroll: false });
    }
  };

  const nextPage = () => {
    if (newOffset !== null) {
      const query = new URLSearchParams({ q: search, offset: String(newOffset), promo });
      router.push(`/students?${query.toString()}`, { scroll: false });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Students</CardTitle>
        <CardDescription>
          Manage your students and view their details.
        </CardDescription>
        <div className="flex justify-start">
            {promo === '' ? (
              <Update eventId="all" onUpdate={handleUpdate} />
            ) : (
              <Update eventId={eventId} onUpdate={handleUpdate} />
            )}
        </div>
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
            {isLoading ? (
              <tr>
                <td colSpan={8} className="text-center py-5">
                  <span>Loading...</span>
                </td>
              </tr>
            ) : (
              studentsList.map((student) => (
                <Student key={student.id} student={student} />
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <div className="flex w-full justify-between items-center">
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