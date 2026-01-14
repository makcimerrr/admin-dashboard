'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Student } from './student';
import { SelectStudent } from '@/lib/db/schema/students';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Trash,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Update from '@/components/update';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from 'react-hot-toast';
import { Skeleton } from '@/components/ui/skeleton';
import PromoStatusDisplay from '@/components/promo-status-display';
import { Input } from '@/components/ui/input';
import debounce from 'lodash.debounce';

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
  const [searchValue, setSearchValue] = useState(search);

  const [isLoading, setIsLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof SelectStudent | null;
    direction: 'asc' | 'desc' | null;
  }>({ key: null, direction: 'asc' });
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        const query = new URLSearchParams(searchParams.toString());
        if (value) {
          query.set('q', value);
        } else {
          query.delete('q');
        }
        query.set('offset', '0');
        router.push(`${pathname}?${query.toString()}`, { scroll: false });
      }, 300),
    [searchParams, pathname, router]
  );

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
    query.set('offset', '0'); // reset pagination

    router.push(`/students?${query.toString()}`, { scroll: false });
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

  const requestTrackFilter = (track: string, completed: string) => {
    const query = new URLSearchParams(searchParams.toString());
    if (track === '') {
      query.delete('track');
      query.delete('track_completed');
      query.set('offset', '0');
      router.push(`${pathname}?${query.toString()}`, { scroll: false });
      return;
    }
    query.set('track', track);
    query.set('track_completed', completed);
    query.set('offset', '0');
    router.push(`${pathname}?${query.toString()}`, { scroll: false });
  };

  const clearFilters = () => {
    const query = new URLSearchParams(searchParams.toString());
    query.delete('filter');
    query.delete('direction');
    query.delete('status');
    query.delete('delay_level');
    query.delete('track');
    query.delete('track_completed');
    router.push(`${pathname}?${query.toString()}`, { scroll: false });
    setSortConfig({ key: null, direction: null });
  };

  return (
    <div className="rounded-lg border bg-background p-6 shadow-sm scroll-smooth">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Étudiants</h2>
          <p className="text-muted-foreground text-sm">
            Gérez les étudiants et visualisez leurs informations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name or login..."
              className="pl-8 sm:w-[300px]"
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
                debouncedSearch(e.target.value);
              }}
            />
          </div>
          {/* Filtres modernisés */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Statut
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-44">
              <DropdownMenuLabel>Filtrer par statut</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => requestStatus('')}>
                Tous
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => requestStatus('audit')}>
                Audit
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => requestStatus('working')}>
                Working
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => requestStatus('without group')}>
                Without Group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Retard
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-44">
              <DropdownMenuLabel>Filtrer par retard</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => requestDelayLevel('')}>
                Tous
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => requestDelayLevel('bien')}>
                Bien
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => requestDelayLevel('en retard')}>
                En Retard
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => requestDelayLevel('en avance')}>
                En Avance
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => requestDelayLevel('spécialité')}
              >
                Spécialité
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => requestDelayLevel('Validé')}>
                Validé
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => requestDelayLevel('Non Validé')}>
                Non Validé
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Troncs
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Filtrer par tronc</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => requestTrackFilter('', '')}>
                Tous
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                Golang
              </DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => requestTrackFilter('golang', 'true')}>
                ✅ Golang terminé
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => requestTrackFilter('golang', 'false')}>
                ⏳ Golang en cours
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                Javascript
              </DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => requestTrackFilter('javascript', 'true')}>
                ✅ Javascript terminé
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => requestTrackFilter('javascript', 'false')}>
                ⏳ Javascript en cours
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                Rust
              </DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => requestTrackFilter('rust', 'true')}>
                ✅ Rust terminé
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => requestTrackFilter('rust', 'false')}>
                ⏳ Rust en cours
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                Java
              </DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => requestTrackFilter('java', 'true')}>
                ✅ Java terminé
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => requestTrackFilter('java', 'false')}>
                ⏳ Java en cours
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            onClick={clearFilters}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <Trash className="h-4 w-4 mr-1" /> Réinitialiser
          </Button>
        </div>
      </div>
      
      <PromoStatusDisplay selectedPromo={promo || 'all'} />

      {/* Update button */}
      <div className="flex justify-start mb-2">
        {promo === '' ? (
          <Update eventId="all" onUpdate={handleUpdate} />
        ) : (
          <Update eventId={eventId} onUpdate={handleUpdate} />
        )}
      </div>
      {/* Table */}
      <div className="overflow-x-auto rounded-lg shadow-sm ring-1 ring-muted/40">
        <Table className="bg-muted/30 rounded-md">
          <TableHeader>
            <TableRow>
              <TableHead
                className="uppercase text-xs font-semibold tracking-wider text-muted-foreground bg-background px-4 py-2"
                onClick={() => requestSort('first_name')}
              >
                Étudiant{' '}
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
              <TableHead
                className="uppercase text-xs font-semibold tracking-wider text-muted-foreground bg-background px-4 py-2"
                onClick={() => requestSort('promos')}
              >
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
              <TableHead
                onClick={() => requestSort('golang_project')}
                className="uppercase text-xs font-semibold tracking-wider text-muted-foreground bg-background px-4 py-2"
              >
                Golang Project{' '}
                {sortConfig.key === 'golang_project' && (
                  <span>
                    {sortConfig.direction === 'asc' ? (
                      <ChevronUp className="inline h-4 w-4" />
                    ) : (
                      <ChevronDown className="inline h-4 w-4" />
                    )}
                  </span>
                )}
              </TableHead>
              <TableHead
                onClick={() => requestSort('javascript_project')}
                className="uppercase text-xs font-semibold tracking-wider text-muted-foreground bg-background px-4 py-2"
              >
                JavaScript Project{' '}
                {sortConfig.key === 'javascript_project' && (
                  <span>
                    {sortConfig.direction === 'asc' ? (
                      <ChevronUp className="inline h-4 w-4" />
                    ) : (
                      <ChevronDown className="inline h-4 w-4" />
                    )}
                  </span>
                )}
              </TableHead>
              <TableHead
                onClick={() => requestSort('rust_project')}
                className="uppercase text-xs font-semibold tracking-wider text-muted-foreground bg-background px-4 py-2"
              >
                Rust/Java Project{' '}
                {sortConfig.key === 'rust_project' && (
                  <span>
                    {sortConfig.direction === 'asc' ? (
                      <ChevronUp className="inline h-4 w-4" />
                    ) : (
                      <ChevronDown className="inline h-4 w-4" />
                    )}
                  </span>
                )}
              </TableHead>
              <TableHead
                className="uppercase text-xs font-semibold tracking-wider text-muted-foreground bg-background px-4 py-2"
                onClick={() => requestSort('delay_level')}
              >
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
              <TableHead className="uppercase text-xs font-semibold tracking-wider text-muted-foreground bg-background px-4 py-2">
                <span>Availability</span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold tracking-wider text-muted-foreground bg-background px-4 py-2">
                <span>Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-3 text-sm">
                  <div className="space-y-2 py-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </td>
              </tr>
            ) : studentsList.length > 0 ? (
              studentsList.map((student) => (
                <Student
                  key={student.id}
                  student={student}
                  rowClassName="hover:bg-muted transition-colors rounded-md border-b"
                  cellClassName="px-4 py-3 text-sm text-foreground/90"
                />
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-3 text-sm">
                  <span>Aucun étudiant trouvé</span>
                </td>
              </tr>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Footer */}
      <div className="flex w-full justify-between items-center mt-4">
        <div className="text-xs text-muted-foreground">
          Affichage{' '}
          <strong>
            {currentOffsetState !== null ? currentOffsetState + 1 : 0}-
            {currentOffsetState !== null
              ? Math.min(
                  currentOffsetState + studentsPerPage,
                  totalStudentsState
                )
              : 0}
          </strong>{' '}
          sur <strong>{totalStudentsState}</strong> étudiants
        </div>
        <div className="flex">
          <Button
            onClick={prevPage}
            variant="ghost"
            size="sm"
            disabled={previousOffsetState === null}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Précédent
          </Button>
          <Button
            onClick={nextPage}
            variant="ghost"
            size="sm"
            disabled={newOffsetState === null}
          >
            Suivant
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
