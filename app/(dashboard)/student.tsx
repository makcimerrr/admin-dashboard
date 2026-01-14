'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, CheckCircle2, ExternalLink } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { SelectStudent } from '@/lib/db/schema/students';
import { deleteStudent } from './actions';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useRouter } from 'next/navigation';

const getProgressStatusClass = (status: string | null) => {
  switch (status) {
    case 'audit':
      return 'bg-orange-500/10 text-orange-700 hover:bg-orange-500/20 border-orange-200';
    case 'setup':
      return 'bg-purple-500/10 text-purple-700 hover:bg-purple-500/20 border-purple-200';
    case 'working':
      return 'bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 border-blue-200';
    case 'finished':
      return 'bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-200';
    case 'without group':
      return 'bg-red-500/10 text-red-700 hover:bg-red-500/20 border-red-200';
    default:
      return 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200';
  }
};

const getDelayLevelClass = (level: string | null) => {
  switch (level) {
    case 'bien':
      return 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200';
    case 'en retard':
      return 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200';
    case 'en avance':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200';
    case 'spécialité':
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200';
    case 'Validé':
      return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200';
    case 'Non Validé':
      return 'bg-rose-100 text-rose-800 hover:bg-rose-200 border-rose-200';
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200';
  }
};

const getStatusStyle = (status: string | null) => {
    switch (status) {
      case 'finished':
        return { className: 'text-green-600 font-medium', emoji: '✅', text: 'Finished' };
      case 'working':
        return { className: 'text-blue-600 font-medium', emoji: '🔨', text: 'Working' };
      case 'audit':
        return { className: 'text-orange-600 font-medium', emoji: '🔍', text: 'Audit' };
      case 'setup':
        return { className: 'text-purple-600 font-medium', emoji: '⚙️', text: 'Setup' };
      case 'without group':
          return { className: 'text-red-600 font-medium', emoji: '🚫', text: 'No Group' };
      case 'not_started':
        return { className: 'text-gray-500', emoji: '⏳', text: 'Not Started' };
      case 'not_chosen':
        return { className: 'text-gray-400 italic', emoji: '🤷', text: 'Not Chosen' };
      default:
        return { className: 'text-gray-400', emoji: '❔', text: 'Unknown' };
    }
  };

export function Student({ student, rowClassName, cellClassName }: { student: SelectStudent; rowClassName?: string, cellClassName?: string }) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/student?id=${student.id}`);
  };

  const golangStatus = getStatusStyle(student.golang_project_status);
  const javascriptStatus = getStatusStyle(student.javascript_project_status);
  
  // Determine the correct status for the Rust/Java column
  let rustJavaStatusRaw = student.java_project_status || student.rust_project_status;
  
  // If one is "not_chosen" but the other has a real status, prioritize the real status
  if (student.java_project_status === 'not_chosen' && student.rust_project_status && student.rust_project_status !== 'not_chosen') {
    rustJavaStatusRaw = student.rust_project_status;
  } else if (student.rust_project_status === 'not_chosen' && student.java_project_status && student.java_project_status !== 'not_chosen') {
    rustJavaStatusRaw = student.java_project_status;
  }

  const rustJavaStatus = getStatusStyle(rustJavaStatusRaw);

  return (
    <>
      <TableRow
        onClick={handleClick}
        data-state={undefined}
        className={cn("transition-colors hover:bg-muted/50 cursor-pointer group", rowClassName)}
      >
        <TableCell className="py-3">
            <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border border-border">
                    <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                        {student.first_name[0]}{student.last_name[0]}
                    </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                        {student.first_name} {student.last_name}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                        {student.login}
                    </span>
                </div>
            </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="font-normal bg-background">
            {student.promos}
          </Badge>
        </TableCell>
        <TableCell>
          <TooltipProvider>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <div className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors",
                    student.golang_completed 
                        ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" 
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                )}>
                  {student.golang_project || 'N/A'}
                  {student.golang_completed ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <div className="h-3.5 w-3.5" /> 
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent className="flex items-center gap-2 px-3 py-2">
                <span className="text-lg">{golangStatus.emoji}</span>
                <span className={cn("font-medium", golangStatus.className)}>{golangStatus.text}</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </TableCell>
        <TableCell>
          <TooltipProvider>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <div className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors",
                    student.javascript_completed 
                        ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" 
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                )}>
                  {student.javascript_project || 'N/A'}
                  {student.javascript_completed ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <div className="h-3.5 w-3.5" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent className="flex items-center gap-2 px-3 py-2">
                <span className="text-lg">{javascriptStatus.emoji}</span>
                <span className={cn("font-medium", javascriptStatus.className)}>{javascriptStatus.text}</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </TableCell>
        <TableCell>
          <TooltipProvider>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <div className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors",
                    (student.java_completed || student.rust_completed)
                        ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" 
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                )}>
                  {student.java_project || student.rust_project || 'N/A'}
                  {(student.java_completed || student.rust_completed) ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <div className="h-3.5 w-3.5" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent className="flex items-center gap-2 px-3 py-2">
                <span className="text-lg">{rustJavaStatus.emoji}</span>
                <span className={cn("font-medium", rustJavaStatus.className)}>{rustJavaStatus.text}</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className={cn("font-medium border", getDelayLevelClass(student.delay_level))}>
            {student.delay_level || 'N/A'}
          </Badge>
        </TableCell>
        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
          {new Date(student.availableAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
        </TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-haspopup="true" size="icon" variant="ghost" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={handleClick} className="cursor-pointer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Voir les détails
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600 focus:text-red-600">
                <form action={deleteStudent} className="w-full">
                  <button type="submit" className="w-full text-left">Delete</button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    </>
  );
}
