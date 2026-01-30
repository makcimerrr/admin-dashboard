import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

/**
 * Skeleton for a single student row
 */
function StudentRowSkeleton() {
  return (
    <TableRow className="border-b">
      {/* Student cell */}
      <TableCell className="py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </TableCell>

      {/* Promo cell */}
      <TableCell>
        <Skeleton className="h-6 w-16 rounded-full" />
      </TableCell>

      {/* Golang project cell */}
      <TableCell>
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-10 rounded" />
          <Skeleton className="h-6 w-24 rounded-md" />
        </div>
      </TableCell>

      {/* JavaScript project cell */}
      <TableCell>
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-10 rounded" />
          <Skeleton className="h-6 w-24 rounded-md" />
        </div>
      </TableCell>

      {/* Rust/Java project cell */}
      <TableCell>
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-10 rounded" />
          <Skeleton className="h-6 w-24 rounded-md" />
        </div>
      </TableCell>

      {/* Delay level cell */}
      <TableCell>
        <Skeleton className="h-6 w-20 rounded-full" />
      </TableCell>

      {/* Availability cell */}
      <TableCell className="hidden md:table-cell">
        <Skeleton className="h-4 w-24" />
      </TableCell>

      {/* Actions cell */}
      <TableCell>
        <Skeleton className="h-8 w-8 rounded" />
      </TableCell>
    </TableRow>
  );
}

/**
 * Full table skeleton with configurable row count
 */
export function StudentsTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="rounded-lg border overflow-hidden bg-background">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-[250px] font-semibold">Étudiant</TableHead>
            <TableHead className="w-[100px] font-semibold">Promo</TableHead>
            <TableHead className="font-semibold">Golang</TableHead>
            <TableHead className="font-semibold">JavaScript</TableHead>
            <TableHead className="font-semibold">Rust/Java</TableHead>
            <TableHead className="w-[100px] font-semibold">Retard</TableHead>
            <TableHead className="w-[120px] font-semibold hidden md:table-cell">
              Disponibilité
            </TableHead>
            <TableHead className="w-[60px] font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <StudentRowSkeleton key={i} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Compact skeleton for inline loading states
 */
export function StudentsLoadingOverlay() {
  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    </div>
  );
}
