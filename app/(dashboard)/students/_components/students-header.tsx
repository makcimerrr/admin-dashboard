'use client';

import { GraduationCap, Users, UserX, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ClientImport from '@/components/clien-import';
import AddStudent from '@/components/add-student';

interface StudentsHeaderProps {
  totalStudents: number;
  activeStudents?: number;
  dropoutStudents?: number;
}

export function StudentsHeader({
  totalStudents,
  activeStudents,
  dropoutStudents
}: StudentsHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      {/* Title section */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-xl">
          <GraduationCap className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Gestion des étudiants
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-muted-foreground">
              {totalStudents} étudiants au total
            </span>
            {activeStudents !== undefined && (
              <Badge
                variant="outline"
                className="gap-1 bg-green-50 text-green-700 border-green-200"
              >
                <UserCheck className="h-3 w-3" />
                {activeStudents} actifs
              </Badge>
            )}
            {dropoutStudents !== undefined && dropoutStudents > 0 && (
              <Badge
                variant="outline"
                className="gap-1 bg-red-50 text-red-700 border-red-200"
              >
                <UserX className="h-3 w-3" />
                {dropoutStudents} en perdition
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <ClientImport />
        <AddStudent />
      </div>
    </div>
  );
}
