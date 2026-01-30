'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

interface StudentsPaginationProps {
  currentOffset: number;
  totalStudents: number;
  studentsPerPage: number;
  previousOffset: number | null;
  newOffset: number | null;
}

export function StudentsPagination({
  currentOffset,
  totalStudents,
  studentsPerPage,
  previousOffset,
  newOffset
}: StudentsPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Calculate pagination values
  const totalPages =
    studentsPerPage === -1 ? 1 : Math.ceil(totalStudents / studentsPerPage);
  const currentPage =
    studentsPerPage === -1
      ? 1
      : Math.floor(currentOffset / studentsPerPage) + 1;

  // Calculate display range
  const displayStart = currentOffset + 1;
  const displayEnd =
    studentsPerPage === -1
      ? totalStudents
      : Math.min(currentOffset + studentsPerPage, totalStudents);

  // Navigation handlers
  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages || studentsPerPage === -1) return;
    const newOffset = (page - 1) * studentsPerPage;
    const query = new URLSearchParams(searchParams.toString());
    query.set('offset', String(newOffset));
    router.push(`${pathname}?${query.toString()}`, { scroll: false });
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);

  const goToPrevPage = () => {
    if (previousOffset !== null) {
      const query = new URLSearchParams(searchParams.toString());
      query.set('offset', String(previousOffset));
      router.push(`${pathname}?${query.toString()}`, { scroll: false });
    }
  };

  const goToNextPage = () => {
    if (newOffset !== null) {
      const query = new URLSearchParams(searchParams.toString());
      query.set('offset', String(newOffset));
      router.push(`${pathname}?${query.toString()}`, { scroll: false });
    }
  };

  const changePageSize = (size: string) => {
    const query = new URLSearchParams(searchParams.toString());
    query.set('limit', size);
    query.set('offset', '0');
    router.push(`${pathname}?${query.toString()}`, { scroll: false });
  };

  // Generate page numbers
  const generatePageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    // First page
    if (startPage > 1) {
      pages.push(
        <Button
          key={1}
          onClick={() => goToPage(1)}
          variant={currentPage === 1 ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
        >
          1
        </Button>
      );
      if (startPage > 2) {
        pages.push(
          <span key="dots1" className="px-1 text-muted-foreground">
            ...
          </span>
        );
      }
    }

    // Middle pages
    for (let i = startPage; i <= endPage; i++) {
      if (i === 1 && startPage > 1) continue;
      if (i === totalPages && endPage < totalPages) continue;
      pages.push(
        <Button
          key={i}
          onClick={() => goToPage(i)}
          variant={currentPage === i ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
        >
          {i}
        </Button>
      );
    }

    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(
          <span key="dots2" className="px-1 text-muted-foreground">
            ...
          </span>
        );
      }
      pages.push(
        <Button
          key={totalPages}
          onClick={() => goToPage(totalPages)}
          variant={currentPage === totalPages ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
        >
          {totalPages}
        </Button>
      );
    }

    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
      {/* Left section: info + page size */}
      <div className="flex flex-wrap items-center gap-4">
        <p className="text-sm text-muted-foreground">
          Affichage{' '}
          <span className="font-medium text-foreground">
            {displayStart}-{displayEnd}
          </span>{' '}
          sur{' '}
          <span className="font-medium text-foreground">{totalStudents}</span>{' '}
          étudiants
        </p>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Par page:</span>
          <Select
            value={String(studentsPerPage)}
            onValueChange={changePageSize}
          >
            <SelectTrigger className="h-8 w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="-1">Tous</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Right section: navigation */}
      {studentsPerPage !== -1 && (
        <div className="flex items-center gap-1">
          <Button
            onClick={goToFirstPage}
            variant="ghost"
            size="sm"
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronsLeft className="h-4 w-4" />
            <span className="sr-only">Première page</span>
          </Button>
          <Button
            onClick={goToPrevPage}
            variant="ghost"
            size="sm"
            disabled={previousOffset === null}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Page précédente</span>
          </Button>

          <div className="flex items-center gap-1 mx-2">
            {generatePageNumbers()}
          </div>

          <Button
            onClick={goToNextPage}
            variant="ghost"
            size="sm"
            disabled={newOffset === null}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Page suivante</span>
          </Button>
          <Button
            onClick={goToLastPage}
            variant="ghost"
            size="sm"
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronsRight className="h-4 w-4" />
            <span className="sr-only">Dernière page</span>
          </Button>

          <span className="text-sm text-muted-foreground ml-2">
            Page {currentPage} / {totalPages}
          </span>
        </div>
      )}
    </div>
  );
}
