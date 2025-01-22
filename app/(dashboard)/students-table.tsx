'use client';

import { useState, useEffect } from 'react';
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
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp
} from 'lucide-react';
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
  eventId
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
  const [sortConfig, setSortConfig] = useState<{
    key: keyof SelectStudent | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    setStudentsList(students);
  }, [students]);

  // Fetch students when URL changes
  useEffect(() => {
    const fetchFilteredStudents = async () => {
      setIsLoading(true);

      const query = new URLSearchParams(searchParams.toString());
      try {
        const response = await fetch(`/api/get_students?${query.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch students');
        const data = await response.json();
        setStudentsList(data.students);
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFilteredStudents().then((r) => r);
  }, [searchParams]);

  const handleUpdate = async () => {
    setIsLoading(true); // Activer le chargement
    try {
      await fetchStudents();
    } catch (error) {
      console.error('Erreur lors de la mise à jour des étudiants:', error);
    } finally {
      setIsLoading(false); // Désactiver le chargement même en cas d'erreur
    }
  };

  const fetchStudents = async () => {
    try {
      const query = new URLSearchParams({
        q: search,
        offset: String(newOffset),
        promo
      });
      const response = await fetch(`/api/get_students?${query.toString()}`);

      if (!response.ok) {
        throw new Error('Erreur de récupération des étudiants');
      }

      const data = await response.json();
      setStudentsList(data.students); // Mise à jour des étudiants
    } catch (error) {
      console.error('Erreur lors de la récupération des étudiants:', error);
    }
  };

  const prevPage = () => {
    if (previousOffset !== null) {
      const query = new URLSearchParams(searchParams.toString()); // Copier les paramètres existants
      query.set('offset', String(previousOffset)); // Mettre à jour l'offset
      router.push(`/students?${query.toString()}`, { scroll: false });
    }
  };

  const nextPage = () => {
    if (newOffset !== null) {
      const query = new URLSearchParams(searchParams.toString()); // Copier les paramètres existants
      query.set('offset', String(newOffset)); // Mettre à jour l'offset
      router.push(`/students?${query.toString()}`, { scroll: false });
    }
  };

  // Update URL with sort
  const requestSort = (key: keyof SelectStudent) => {
    const direction =
      sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';

    setSortConfig({ key, direction });

    const query = new URLSearchParams(searchParams.toString());
    query.set('filter', key);
    query.set('direction', direction);

    router.push(`${pathname}?${query.toString()}`, { scroll: false });
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
              <TableHead onClick={() => requestSort('first_name')}>
                First Name{' '}
                {sortConfig.key === 'first_name' && (
                  <span>
                    {sortConfig.direction === 'asc' ? (
                      <ChevronUp className="inline h-4 w-4" />
                    ) : (
                      <ChevronDown className="inline h-4 w-4" />
                    )}
                  </span>
                )}
              </TableHead>
              <TableHead onClick={() => requestSort('last_name')}>
                Last Name{' '}
                {sortConfig.key === 'last_name' && (
                  <span>
                    {sortConfig.direction === 'asc' ? (
                      <ChevronUp className="inline h-4 w-4" />
                    ) : (
                      <ChevronDown className="inline h-4 w-4" />
                    )}
                  </span>
                )}
              </TableHead>
              <TableHead onClick={() => requestSort('login')}>
                Login{' '}
                {sortConfig.key === 'login' && (
                  <span>
                    {sortConfig.direction === 'asc' ? (
                      <ChevronUp className="inline h-4 w-4" />
                    ) : (
                      <ChevronDown className="inline h-4 w-4" />
                    )}
                  </span>
                )}
              </TableHead>
              <TableHead onClick={() => requestSort('promos')}>
                Promo{' '}
                {sortConfig.key === 'promos' && (
                  <span>
                    {sortConfig.direction === 'asc' ? (
                      <ChevronUp className="inline h-4 w-4" />
                    ) : (
                      <ChevronDown className="inline h-4 w-4" />
                    )}
                  </span>
                )}
              </TableHead>
              <TableHead onClick={() => requestSort('project_name')}>
                Project{' '}
                {sortConfig.key === 'project_name' && (
                  <span>
                    {sortConfig.direction === 'asc' ? (
                      <ChevronUp className="inline h-4 w-4" />
                    ) : (
                      <ChevronDown className="inline h-4 w-4" />
                    )}
                  </span>
                )}
              </TableHead>
              <TableHead onClick={() => requestSort('progress_status')}>
                Status{' '}
                {sortConfig.key === 'progress_status' && (
                  <span>
                    {sortConfig.direction === 'asc' ? (
                      <ChevronUp className="inline h-4 w-4" />
                    ) : (
                      <ChevronDown className="inline h-4 w-4" />
                    )}
                  </span>
                )}
              </TableHead>
              <TableHead onClick={() => requestSort('delay_level')}>
                Retard{' '}
                {sortConfig.key === 'delay_level' && (
                  <span>
                    {sortConfig.direction === 'asc' ? (
                      <ChevronUp className="inline h-4 w-4" />
                    ) : (
                      <ChevronDown className="inline h-4 w-4" />
                    )}
                  </span>
                )}
              </TableHead>
              <TableHead onClick={() => requestSort('availableAt')}>
                Available At{' '}
                {sortConfig.key === 'availableAt' && (
                  <span>
                    {sortConfig.direction === 'asc' ? (
                      <ChevronUp className="inline h-4 w-4" />
                    ) : (
                      <ChevronDown className="inline h-4 w-4" />
                    )}
                  </span>
                )}
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
            ) : studentsList.length > 0 ? (
              studentsList.map((student) => (
                <Student key={student.id} student={student} />
              ))
            ) : (
              <tr>
                <td colSpan={8} className="text-center py-5">
                  <span>No students found</span>
                </td>
              </tr>
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
