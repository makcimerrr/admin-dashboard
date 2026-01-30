'use client';

import { Table, TableBody } from '@/components/ui/table';
import { SelectStudent } from '@/lib/db/schema/students';
import { StudentsTableHeader } from './table-header';
import { StudentTableRow } from './table-row';
import { EmptyState } from './empty-state';
import { StudentsTableSkeleton, StudentsLoadingOverlay } from './table-skeleton';
import { cn } from '@/lib/utils';

interface PromoDates {
  start: string;
  'piscine-js-start': string;
  'piscine-js-end': string;
  'piscine-rust-java-start': string;
  'piscine-rust-java-end': string;
  end: string;
}

interface PromoConfig {
  key: string;
  eventId: number;
  title: string;
  dates: PromoDates;
}

interface StudentsTableProps {
  students: SelectStudent[];
  isLoading?: boolean;
  searchQuery?: string;
  hasFilters?: boolean;
  currentSortKey: string | null;
  currentSortDirection: 'asc' | 'desc' | null;
  promoConfig?: PromoConfig[];
  onClearFilters?: () => void;
}

export function StudentsTable({
  students,
  isLoading = false,
  searchQuery,
  hasFilters = false,
  currentSortKey,
  currentSortDirection,
  promoConfig,
  onClearFilters
}: StudentsTableProps) {
  // Show skeleton while loading
  if (isLoading && students.length === 0) {
    return <StudentsTableSkeleton rows={10} />;
  }

  // Show empty state when no students
  if (!isLoading && students.length === 0) {
    return (
      <EmptyState
        type="no-results"
        searchQuery={searchQuery}
        hasFilters={hasFilters}
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    <div className={cn('relative rounded-lg border overflow-hidden bg-background shadow-sm')}>
      {/* Loading overlay when refreshing */}
      {isLoading && students.length > 0 && <StudentsLoadingOverlay />}

      <div className="overflow-x-auto">
        <Table>
          <StudentsTableHeader
            currentSortKey={currentSortKey}
            currentSortDirection={currentSortDirection}
          />
          <TableBody>
            {students.map((student) => (
              <StudentTableRow
                key={student.id}
                student={student}
                promoConfig={promoConfig}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Re-export sub-components for flexibility
export { StudentsTableHeader } from './table-header';
export { StudentTableRow } from './table-row';
export { EmptyState } from './empty-state';
export { StudentsTableSkeleton, StudentsLoadingOverlay } from './table-skeleton';
