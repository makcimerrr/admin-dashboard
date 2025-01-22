'use client';

import React, { useState, useEffect } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Trash } from 'lucide-react';
import { toast } from 'react-hot-toast';

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
  const [totalStudentsState, setTotalStudentsState] = useState(totalStudents);
  const [currentOffsetState, setCurrentOffsetState] = useState(currentOffset);
  const [newOffsetState, setNewOffsetState] = useState(newOffset);
  const [previousOffsetState, setPreviousOffsetState] =
    useState(previousOffset);

  const [isLoading, setIsLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof SelectStudent | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    setStudentsList(students);
  }, [students]);

  useEffect(() => {
    const filter = searchParams.get('filter') as keyof SelectStudent | null;
    const direction = searchParams.get('direction') as 'asc' | 'desc' | null;

    if (filter && direction) {
      setSortConfig({ key: filter, direction });
    }
  }, [searchParams]);

  useEffect(() => {
    const status = searchParams.get('status');
    if (status) {
      const selectElement = document.querySelector('select');
      if (selectElement) {
        selectElement.value = status;
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchFilteredStudents = async () => {
      setIsLoading(true);

      const query = new URLSearchParams(searchParams.toString());
      try {
        const response = await fetch(`/api/get_students?${query.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch students');
        const data = await response.json();
        setStudentsList(data.students);
        setTotalStudentsState(data.totalStudents);
        setCurrentOffsetState(data.currentOffset);
        setNewOffsetState(data.newOffset);
        setPreviousOffsetState(data.previousOffset);
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFilteredStudents().then((r) => r);
  }, [searchParams]);

  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      await fetchStudents();
    } catch (error) {
      console.error('Erreur lors de la mise à jour des étudiants:', error);
    } finally {
      setIsLoading(false);
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
      setStudentsList(data.students);
    } catch (error) {
      console.error('Erreur lors de la récupération des étudiants:', error);
    }
  };

  const prevPage = () => {
    if (previousOffset !== null) {
      const query = new URLSearchParams(searchParams.toString());
      query.set('offset', String(previousOffset));
      router.push(`/students?${query.toString()}`, { scroll: false });
    }
  };

  const nextPage = () => {
    if (newOffset !== null) {
      const query = new URLSearchParams(searchParams.toString());
      query.set('offset', String(newOffset));
      router.push(`/students?${query.toString()}`, { scroll: false });
    }
  };

  const requestSort = (key: keyof SelectStudent) => {
    const direction =
      sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';

    setSortConfig({ key, direction });

    const query = new URLSearchParams(searchParams.toString());
    query.set('filter', key);
    query.set('direction', direction);

    router.push(`${pathname}?${query.toString()}`, { scroll: false });
  };

  const requestStatus = (status: string) => {
    const query = new URLSearchParams(searchParams.toString());
    if (status === '') {
      query.delete('status');
      router.push(`${pathname}?${query.toString()}`, { scroll: false });
      return;
    } else if (status === query.get('status')) {
      toast.error('Ce critère est déjà sélectionné !');
      return;
    }
    query.set('status', status);
    router.push(`${pathname}?${query.toString()}`, { scroll: false });
  };
  const requestDelayLevel = (delay_level: string) => {
    const query = new URLSearchParams(searchParams.toString());
    if (delay_level === '') {
      query.delete('delay_level');
      router.push(`${pathname}?${query.toString()}`, { scroll: false });
      return;
    } else if (delay_level === query.get('delay_level')) {
      toast.error('Ce critère est déjà sélectionné !');
      return;
    }
    query.set('delay_level', delay_level);
    router.push(`${pathname}?${query.toString()}`, { scroll: false });
  };
  const clearFilters = () => {
    const query = new URLSearchParams(searchParams.toString());
    query.delete('filter');
    query.delete('direction');
    query.delete('status');
    query.delete('delay_level');
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
        <div className="flex justify-end space-x-4 items-center">
          {/* Dropdown Menu for Select Status */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="sm" className="text-white">
                Select Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="z-50 bg-white rounded-md shadow-lg border border-gray-200 mt-2 w-44">
              <DropdownMenuItem
                onSelect={() => requestStatus('')}
                className="hover:bg-gray-100 p-2 rounded-md cursor-pointer"
              >
                All
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => requestStatus('audit')}
                className="hover:bg-gray-100 p-2 rounded-md cursor-pointer"
              >
                Audit
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => requestStatus('working')}
                className="hover:bg-gray-100 p-2 rounded-md cursor-pointer"
              >
                Working
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => requestStatus('without group')}
                className="hover:bg-gray-100 p-2 rounded-md cursor-pointer"
              >
                Without Group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Dropdown Menu for Select Delay Level */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="sm" className="text-white">
                Select Delay Level
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="z-50 bg-white rounded-md shadow-lg border border-gray-200 mt-2 w-44">
              <DropdownMenuItem
                onSelect={() => requestDelayLevel('')}
                className="hover:bg-gray-100 p-2 rounded-md cursor-pointer"
              >
                All
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => requestDelayLevel('bien')}
                className="hover:bg-gray-100 p-2 rounded-md cursor-pointer"
              >
                Bien
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => requestDelayLevel('en retard')}
                className="hover:bg-gray-100 p-2 rounded-md cursor-pointer"
              >
                En Retard
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => requestDelayLevel('en avance')}
                className="hover:bg-gray-100 p-2 rounded-md cursor-pointer"
              >
                En Avance
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => requestDelayLevel('spécialité')}
                className="hover:bg-gray-100 p-2 rounded-md cursor-pointer"
              >
                Spécialité
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear Filters Button */}
          <Button
            onClick={clearFilters}
            variant="ghost"
            size="sm"
            className="bg-transparent text-gray-600 hover:text-gray-800 border-none focus:outline-none"
          >
            <Trash className="inline h-4 w-4" />
          </Button>
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
              {currentOffsetState !== null ? currentOffsetState + 1 : 0}-
              {currentOffsetState !== null
                ? Math.min(
                    currentOffsetState + studentsPerPage,
                    totalStudentsState
                  )
                : 0}
            </strong>{' '}
            of <strong>{totalStudentsState}</strong> students
          </div>

          <div className="flex">
            <Button
              onClick={prevPage}
              variant="ghost"
              size="sm"
              disabled={previousOffsetState === null}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Prev
            </Button>
            <Button
              onClick={nextPage}
              variant="ghost"
              size="sm"
              disabled={newOffsetState === null}
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
