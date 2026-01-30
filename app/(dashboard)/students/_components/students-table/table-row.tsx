'use client';

import { useRouter } from 'next/navigation';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UserX } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { SelectStudent } from '@/lib/db/schema/students';
import { StudentCell } from './cells/student-cell';
import { ProjectCell } from './cells/project-cell';
import { ActionsCell } from './cells/actions-cell';

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

interface StudentTableRowProps {
  student: SelectStudent;
  promoConfig?: PromoConfig[];
}

// Delay level badge styling
const getDelayLevelClass = (level: string | null) => {
  switch (level) {
    case 'bien':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'en retard':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'en avance':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'spécialité':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Validé':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'Non Validé':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export function StudentTableRow({ student, promoConfig }: StudentTableRowProps) {
  const router = useRouter();
  const isDropout = student.isDropout === true;
  const isAlternant = student.isAlternant === true;

  // Find promo config for this student
  const studentPromoConfig = promoConfig?.find((p) => p.key === student.promos);
  const today = new Date();

  // Check if JavaScript track has started
  const jsStartDate = studentPromoConfig?.dates['piscine-js-start'];
  const jsHasStarted =
    jsStartDate &&
    jsStartDate !== 'NaN' &&
    !isNaN(new Date(jsStartDate).getTime()) &&
    today >= new Date(jsStartDate);

  // Check if Rust/Java track has started
  const rustJavaStartDate = studentPromoConfig?.dates['piscine-rust-java-start'];
  const rustJavaHasStarted =
    rustJavaStartDate &&
    rustJavaStartDate !== 'NaN' &&
    !isNaN(new Date(rustJavaStartDate).getTime()) &&
    today >= new Date(rustJavaStartDate);

  // Determine effective JS status
  const getEffectiveJsStatus = () => {
    if (!jsHasStarted && studentPromoConfig) {
      if (
        student.javascript_project_status === 'without group' ||
        student.javascript_project_status === 'not_started' ||
        !student.javascript_project_status
      ) {
        return 'track_not_started';
      }
    }
    return student.javascript_project_status;
  };

  // Determine effective Rust/Java status
  const getEffectiveRustJavaStatus = () => {
    if (!rustJavaHasStarted && studentPromoConfig) {
      const rawStatus =
        student.java_project_status || student.rust_project_status;
      if (
        rawStatus === 'without group' ||
        rawStatus === 'not_started' ||
        rawStatus === 'not_chosen' ||
        !rawStatus
      ) {
        return 'track_not_started';
      }
    }
    // Original logic for determining status
    let status = student.java_project_status || student.rust_project_status;
    if (
      student.java_project_status === 'not_chosen' &&
      student.rust_project_status &&
      student.rust_project_status !== 'not_chosen'
    ) {
      status = student.rust_project_status;
    } else if (
      student.rust_project_status === 'not_chosen' &&
      student.java_project_status &&
      student.java_project_status !== 'not_chosen'
    ) {
      status = student.java_project_status;
    }
    return status;
  };

  const effectiveJsStatus = getEffectiveJsStatus();
  const effectiveRustJavaStatus = getEffectiveRustJavaStatus();

  // Determine which Rust/Java project to show
  const rustJavaProject = student.java_project || student.rust_project;
  const rustJavaPosition = student.java_project
    ? student.java_project_position
    : student.rust_project_position;
  const rustJavaTotal = student.java_project
    ? student.java_project_total
    : student.rust_project_total;
  const rustJavaCompleted = student.java_completed || student.rust_completed;

  const handleRowClick = () => {
    router.push(`/student?id=${student.id}`);
  };

  return (
    <TableRow
      onClick={handleRowClick}
      className={cn(
        'transition-colors hover:bg-muted/50 cursor-pointer group',
        isDropout && 'bg-red-50/50 hover:bg-red-100/50 opacity-75'
      )}
    >
      {/* Student cell */}
      <TableCell className="py-4">
        <StudentCell
          firstName={student.first_name}
          lastName={student.last_name}
          login={student.login}
          isDropout={isDropout}
          isAlternant={isAlternant}
          dropoutReason={student.dropoutReason}
          companyName={student.companyName}
        />
      </TableCell>

      {/* Promo cell */}
      <TableCell>
        {isDropout ? (
          <TooltipProvider>
            <Tooltip delayDuration={200}>
              <TooltipTrigger>
                <Badge
                  variant="outline"
                  className="font-medium bg-red-50 text-red-700 border-red-200"
                >
                  <UserX className="h-3 w-3 mr-1" />
                  Perdition
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  Ancienne promo: {student.previousPromo || student.promos}
                </p>
                {student.dropoutAt && (
                  <p className="text-xs text-muted-foreground">
                    Depuis:{' '}
                    {new Date(student.dropoutAt).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Badge variant="outline" className="font-normal bg-background">
            {student.promos}
          </Badge>
        )}
      </TableCell>

      {/* Golang project cell */}
      <TableCell>
        <ProjectCell
          projectName={student.golang_project}
          status={student.golang_project_status}
          position={student.golang_project_position}
          total={student.golang_project_total}
          completed={student.golang_completed}
          trackNotStarted={false}
        />
      </TableCell>

      {/* JavaScript project cell */}
      <TableCell>
        <ProjectCell
          projectName={
            effectiveJsStatus === 'track_not_started'
              ? null
              : student.javascript_project
          }
          status={effectiveJsStatus}
          position={
            effectiveJsStatus === 'track_not_started'
              ? null
              : student.javascript_project_position
          }
          total={
            effectiveJsStatus === 'track_not_started'
              ? null
              : student.javascript_project_total
          }
          completed={student.javascript_completed}
          trackNotStarted={effectiveJsStatus === 'track_not_started'}
        />
      </TableCell>

      {/* Rust/Java project cell */}
      <TableCell>
        <ProjectCell
          projectName={
            effectiveRustJavaStatus === 'track_not_started'
              ? null
              : rustJavaProject
          }
          status={effectiveRustJavaStatus}
          position={
            effectiveRustJavaStatus === 'track_not_started'
              ? null
              : rustJavaPosition
          }
          total={
            effectiveRustJavaStatus === 'track_not_started'
              ? null
              : rustJavaTotal
          }
          completed={rustJavaCompleted}
          trackNotStarted={effectiveRustJavaStatus === 'track_not_started'}
        />
      </TableCell>

      {/* Delay level cell */}
      <TableCell>
        <Badge
          variant="outline"
          className={cn(
            'font-medium border',
            getDelayLevelClass(student.delay_level)
          )}
        >
          {student.delay_level || 'N/A'}
        </Badge>
      </TableCell>

      {/* Availability cell */}
      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
        {new Date(student.availableAt).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })}
      </TableCell>

      {/* Actions cell */}
      <TableCell>
        <ActionsCell
          studentId={student.id}
          isDropout={isDropout}
          isAlternant={isAlternant}
        />
      </TableCell>
    </TableRow>
  );
}
