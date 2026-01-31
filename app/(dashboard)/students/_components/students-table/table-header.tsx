'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type SortableColumn =
  | 'first_name'
  | 'promos'
  | 'golang_project'
  | 'javascript_project'
  | 'rust_project'
  | 'delay_level';

interface Column {
  key: SortableColumn | 'availability' | 'actions';
  label: string;
  sortable: boolean;
  className?: string;
  hideOnMobile?: boolean;
}

const columns: Column[] = [
  { key: 'first_name', label: 'Étudiant', sortable: true, className: 'w-[250px]' },
  { key: 'promos', label: 'Promo', sortable: true, className: 'w-[100px]' },
  { key: 'golang_project', label: 'Golang', sortable: true },
  { key: 'javascript_project', label: 'JavaScript', sortable: true },
  { key: 'rust_project', label: 'Rust/Java', sortable: true },
  { key: 'delay_level', label: 'Retard', sortable: true, className: 'w-[100px]' },
  {
    key: 'availability',
    label: 'Disponibilité',
    sortable: false,
    className: 'w-[120px]',
    hideOnMobile: true
  },
  { key: 'actions', label: 'Actions', sortable: false, className: 'w-[60px]' }
];

interface StudentsTableHeaderProps {
  currentSortKey: string | null;
  currentSortDirection: 'asc' | 'desc' | null;
}

export function StudentsTableHeader({
  currentSortKey,
  currentSortDirection
}: StudentsTableHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSort = (key: SortableColumn) => {
    const direction =
      currentSortKey === key && currentSortDirection === 'asc' ? 'desc' : 'asc';

    const query = new URLSearchParams(searchParams.toString());
    query.set('filter', key);
    query.set('direction', direction);
    query.set('offset', '0');

    router.push(`${pathname}?${query.toString()}`, { scroll: false });
  };

  const renderSortIcon = (key: string, sortable: boolean) => {
    if (!sortable) return null;

    const isActive = currentSortKey === key;

    if (isActive) {
      return currentSortDirection === 'asc' ? (
        <ArrowUp className="h-4 w-4 text-primary" />
      ) : (
        <ArrowDown className="h-4 w-4 text-primary" />
      );
    }

    return <ArrowUpDown className="h-4 w-4 opacity-30" />;
  };

  return (
    <TableHeader>
      <TableRow className="bg-muted/50 hover:bg-muted/50">
        {columns.map((column) => (
          <TableHead
            key={column.key}
            className={cn(
              'uppercase text-xs font-semibold tracking-wider text-muted-foreground px-4 py-3',
              column.sortable && 'cursor-pointer select-none hover:text-foreground transition-colors',
              column.className,
              column.hideOnMobile && 'hidden md:table-cell'
            )}
            onClick={
              column.sortable
                ? () => handleSort(column.key as SortableColumn)
                : undefined
            }
          >
            <div className="flex items-center gap-2">
              <span>{column.label}</span>
              {renderSortIcon(column.key, column.sortable)}
            </div>
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}
