'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PILL } from '@/lib/status-pills';
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

const getDelayLevelClass = (level: string | null) => {
  switch (level) {
    case 'bien':
      return PILL.emerald;
    case 'en retard':
      return PILL.red;
    case 'en avance':
      return PILL.blue;
    case 'spécialité':
      return PILL.amber;
    case 'Validé':
      return PILL.emerald;
    case 'Non Validé':
      return PILL.rose;
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

interface StudentMobileCardProps {
  student: SelectStudent;
  promoConfig?: PromoConfig[];
}

export function StudentMobileCard({ student, promoConfig }: StudentMobileCardProps) {
  const router = useRouter();
  const isDropout = student.isDropout === true;
  const isAlternant = student.isAlternant === true;

  const studentPromoConfig = promoConfig?.find((p) => p.key === student.promos);
  const today = new Date();

  const jsStartDate = studentPromoConfig?.dates['piscine-js-start'];
  const jsHasStarted =
    jsStartDate &&
    jsStartDate !== 'NaN' &&
    !isNaN(new Date(jsStartDate).getTime()) &&
    today >= new Date(jsStartDate);

  const rustJavaStartDate = studentPromoConfig?.dates['piscine-rust-java-start'];
  const rustJavaHasStarted =
    rustJavaStartDate &&
    rustJavaStartDate !== 'NaN' &&
    !isNaN(new Date(rustJavaStartDate).getTime()) &&
    today >= new Date(rustJavaStartDate);

  const effectiveJsStatus = (() => {
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
  })();

  const effectiveRustJavaStatus = (() => {
    if (!rustJavaHasStarted && studentPromoConfig) {
      const rawStatus = student.java_project_status || student.rust_project_status;
      if (
        rawStatus === 'without group' ||
        rawStatus === 'not_started' ||
        rawStatus === 'not_chosen' ||
        !rawStatus
      ) {
        return 'track_not_started';
      }
    }
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
  })();

  const rustJavaProject = student.java_project || student.rust_project;
  const rustJavaPosition = student.java_project
    ? student.java_project_position
    : student.rust_project_position;
  const rustJavaTotal = student.java_project
    ? student.java_project_total
    : student.rust_project_total;
  const rustJavaCompleted = student.java_completed || student.rust_completed;

  const handleClick = () => {
    router.push(`/students/${student.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group rounded-lg border bg-card p-3 cursor-pointer active:bg-muted/50 transition-colors',
        isDropout && 'bg-destructive/5 opacity-80'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <StudentCell
            firstName={student.first_name}
            lastName={student.last_name}
            login={student.login}
            isDropout={isDropout}
            isAlternant={isAlternant}
            dropoutReason={student.dropoutReason}
            companyName={student.companyName}
          />
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant="outline" className="font-normal text-[10px] px-1.5 py-0">
            {student.promos}
          </Badge>
          <Badge
            variant="outline"
            className={cn('font-medium text-[10px] px-1.5 py-0', getDelayLevelClass(student.delay_level))}
          >
            {student.delay_level || 'N/A'}
          </Badge>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-1.5 text-xs">
        <div className="flex items-start gap-2">
          <span className="w-12 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground pt-0.5">Go</span>
          <div className="min-w-0 flex-1">
            <ProjectCell
              projectName={student.golang_project}
              status={student.golang_project_status}
              position={student.golang_project_position}
              total={student.golang_project_total}
              completed={student.golang_completed}
              trackNotStarted={false}
            />
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="w-12 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground pt-0.5">JS</span>
          <div className="min-w-0 flex-1">
            <ProjectCell
              projectName={effectiveJsStatus === 'track_not_started' ? null : student.javascript_project}
              status={effectiveJsStatus}
              position={effectiveJsStatus === 'track_not_started' ? null : student.javascript_project_position}
              total={effectiveJsStatus === 'track_not_started' ? null : student.javascript_project_total}
              completed={student.javascript_completed}
              trackNotStarted={effectiveJsStatus === 'track_not_started'}
            />
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="w-12 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground pt-0.5">Rust/Java</span>
          <div className="min-w-0 flex-1">
            <ProjectCell
              projectName={effectiveRustJavaStatus === 'track_not_started' ? null : rustJavaProject}
              status={effectiveRustJavaStatus}
              position={effectiveRustJavaStatus === 'track_not_started' ? null : rustJavaPosition}
              total={effectiveRustJavaStatus === 'track_not_started' ? null : rustJavaTotal}
              completed={rustJavaCompleted}
              trackNotStarted={effectiveRustJavaStatus === 'track_not_started'}
            />
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
        <ActionsCell studentId={student.id} isDropout={isDropout} isAlternant={isAlternant} />
      </div>
    </div>
  );
}
