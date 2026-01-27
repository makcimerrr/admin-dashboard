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
import { MoreHorizontal, CheckCircle2, ExternalLink, UserX, UserCheck, AlertTriangle, Briefcase } from 'lucide-react';
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
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
        return { className: 'text-green-600 font-medium', emoji: '✅', text: 'Finished', letter: 'F', letterClass: 'bg-green-100 text-green-700 border-green-300' };
      case 'working':
        return { className: 'text-blue-600 font-medium', emoji: '🔨', text: 'Working', letter: 'W', letterClass: 'bg-blue-100 text-blue-700 border-blue-300' };
      case 'audit':
        return { className: 'text-orange-600 font-medium', emoji: '🔍', text: 'Audit', letter: 'A', letterClass: 'bg-orange-100 text-orange-700 border-orange-300' };
      case 'setup':
        return { className: 'text-purple-600 font-medium', emoji: '⚙️', text: 'Setup', letter: 'S', letterClass: 'bg-purple-100 text-purple-700 border-purple-300' };
      case 'without group':
          return { className: 'text-red-600 font-medium', emoji: '🚫', text: 'No Group', letter: 'X', letterClass: 'bg-red-100 text-red-700 border-red-300' };
      case 'not_started':
        return { className: 'text-gray-500', emoji: '⏳', text: 'Not Started', letter: '-', letterClass: 'bg-gray-100 text-gray-500 border-gray-300' };
      case 'not_chosen':
        return { className: 'text-gray-400 italic', emoji: '🤷', text: 'Not Chosen', letter: '?', letterClass: 'bg-gray-100 text-gray-400 border-gray-300' };
      case 'track_not_started':
        return { className: 'text-slate-400 italic', emoji: '🕐', text: 'Non démarré', letter: '-', letterClass: 'bg-slate-100 text-slate-400 border-slate-300' };
      default:
        return { className: 'text-gray-400', emoji: '❔', text: 'Unknown', letter: '?', letterClass: 'bg-gray-100 text-gray-400 border-gray-300' };
    }
  };

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

export function Student({ student, rowClassName, cellClassName, promoConfig }: { student: SelectStudent; rowClassName?: string, cellClassName?: string, promoConfig?: PromoConfig[] }) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/student?id=${student.id}`);
  };

  // Trouver les dates de la promo de l'étudiant
  const studentPromoConfig = promoConfig?.find(p => p.key === student.promos);
  const today = new Date();

  // Vérifier si le tronc Javascript a commencé
  const jsStartDate = studentPromoConfig?.dates['piscine-js-start'];
  const jsHasStarted = jsStartDate && jsStartDate !== 'NaN' && !isNaN(new Date(jsStartDate).getTime()) && today >= new Date(jsStartDate);

  // Vérifier si le tronc Rust/Java a commencé
  const rustJavaStartDate = studentPromoConfig?.dates['piscine-rust-java-start'];
  const rustJavaHasStarted = rustJavaStartDate && rustJavaStartDate !== 'NaN' && !isNaN(new Date(rustJavaStartDate).getTime()) && today >= new Date(rustJavaStartDate);

  // Déterminer le status du projet JS en fonction de si le tronc a commencé
  const getEffectiveJsStatus = () => {
    if (!jsHasStarted && studentPromoConfig) {
      // Le tronc n'a pas commencé, on affiche "Non démarré" au lieu de "No Group"
      if (student.javascript_project_status === 'without group' || student.javascript_project_status === 'not_started' || !student.javascript_project_status) {
        return 'track_not_started';
      }
    }
    return student.javascript_project_status;
  };

  // Déterminer le status du projet Rust/Java en fonction de si le tronc a commencé
  const getEffectiveRustJavaStatus = () => {
    if (!rustJavaHasStarted && studentPromoConfig) {
      // Le tronc n'a pas commencé
      const rawStatus = student.java_project_status || student.rust_project_status;
      if (rawStatus === 'without group' || rawStatus === 'not_started' || rawStatus === 'not_chosen' || !rawStatus) {
        return 'track_not_started';
      }
    }
    // Logique originale pour déterminer le status
    let status = student.java_project_status || student.rust_project_status;
    if (student.java_project_status === 'not_chosen' && student.rust_project_status && student.rust_project_status !== 'not_chosen') {
      status = student.rust_project_status;
    } else if (student.rust_project_status === 'not_chosen' && student.java_project_status && student.java_project_status !== 'not_chosen') {
      status = student.java_project_status;
    }
    return status;
  };

  const golangStatus = getStatusStyle(student.golang_project_status);
  const javascriptStatus = getStatusStyle(getEffectiveJsStatus());
  const rustJavaStatus = getStatusStyle(getEffectiveRustJavaStatus());

  const [isLoading, setIsLoading] = useState(false);

  const handleDropoutAction = async (action: 'dropout' | 'reactivate') => {
    setIsLoading(true);
    try {
      if (action === 'dropout') {
        const response = await fetch(`/api/student/${student.id}/dropout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'other' })
        });
        if (response.ok) {
          toast.success('Étudiant marqué en perdition');
          router.refresh();
        } else {
          toast.error('Erreur lors du marquage');
        }
      } else {
        const response = await fetch(`/api/student/${student.id}/dropout`, {
          method: 'DELETE'
        });
        if (response.ok) {
          toast.success('Étudiant réactivé');
          router.refresh();
        } else {
          toast.error('Erreur lors de la réactivation');
        }
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAlternantAction = async (action: 'set' | 'remove') => {
    setIsLoading(true);
    try {
      if (action === 'set') {
        const response = await fetch(`/api/student/${student.id}/alternant`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        if (response.ok) {
          toast.success('Étudiant marqué comme alternant');
          router.refresh();
        } else {
          toast.error('Erreur lors du marquage');
        }
      } else {
        const response = await fetch(`/api/student/${student.id}/alternant`, {
          method: 'DELETE'
        });
        if (response.ok) {
          toast.success('Statut alternant retiré');
          router.refresh();
        } else {
          toast.error('Erreur lors de la mise à jour');
        }
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const isDropout = student.isDropout === true;
  const isAlternant = student.isAlternant === true;

  return (
    <>
      <TableRow
        onClick={handleClick}
        data-state={undefined}
        className={cn(
          "transition-colors hover:bg-muted/50 cursor-pointer group",
          isDropout && "bg-red-50/50 hover:bg-red-100/50 opacity-75",
          rowClassName
        )}
      >
        <TableCell className="py-3">
            <div className="flex items-center gap-3">
                <Avatar className={cn(
                  "h-9 w-9 border",
                  isDropout ? "border-red-300 opacity-60" : "border-border"
                )}>
                    <AvatarFallback className={cn(
                      "font-medium text-xs",
                      isDropout ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary"
                    )}>
                        {student.first_name[0]}{student.last_name[0]}
                    </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      {isDropout && (
                        <TooltipProvider>
                          <Tooltip delayDuration={200}>
                            <TooltipTrigger>
                              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Étudiant en perdition</p>
                              {student.dropoutReason && <p className="text-xs text-muted-foreground">Raison: {student.dropoutReason}</p>}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {isAlternant && (
                        <TooltipProvider>
                          <Tooltip delayDuration={200}>
                            <TooltipTrigger>
                              <Briefcase className="h-3.5 w-3.5 text-blue-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Alternant</p>
                              {student.companyName && <p className="text-xs text-muted-foreground">{student.companyName}</p>}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <span className={cn(
                        "font-medium text-sm transition-colors",
                        isDropout ? "text-red-700 line-through" : "text-foreground group-hover:text-primary"
                      )}>
                          {student.first_name} {student.last_name}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                        {student.login}
                    </span>
                </div>
            </div>
        </TableCell>
        <TableCell>
          {isDropout ? (
            <TooltipProvider>
              <Tooltip delayDuration={200}>
                <TooltipTrigger>
                  <Badge variant="outline" className="font-medium bg-red-50 text-red-700 border-red-200">
                    <UserX className="h-3 w-3 mr-1" />
                    Perdition
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Ancienne promo: {student.previousPromo || student.promos}</p>
                  {student.dropoutAt && <p className="text-xs text-muted-foreground">Depuis: {new Date(student.dropoutAt).toLocaleDateString('fr-FR')}</p>}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Badge variant="outline" className="font-normal bg-background">
              {student.promos}
            </Badge>
          )}
        </TableCell>
        <TableCell>
          <TooltipProvider>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <div className="inline-flex items-center gap-1.5">
                  <span className={cn(
                    "inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold border",
                    golangStatus.letterClass
                  )}>
                    {golangStatus.letter}
                  </span>
                  {student.golang_project_position && student.golang_project_total && (
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {student.golang_project_position}/{student.golang_project_total}
                    </span>
                  )}
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
                <div className="inline-flex items-center gap-1.5">
                  <span className={cn(
                    "inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold border",
                    javascriptStatus.letterClass
                  )}>
                    {javascriptStatus.letter}
                  </span>
                  {/* N'afficher la position que si le tronc a commencé */}
                  {getEffectiveJsStatus() !== 'track_not_started' && student.javascript_project_position && student.javascript_project_total && (
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {student.javascript_project_position}/{student.javascript_project_total}
                    </span>
                  )}
                  {getEffectiveJsStatus() === 'track_not_started' ? (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium bg-slate-50 text-slate-400 border-slate-200 italic">
                      Non démarré
                    </div>
                  ) : (
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
                <div className="inline-flex items-center gap-1.5">
                  <span className={cn(
                    "inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold border",
                    rustJavaStatus.letterClass
                  )}>
                    {rustJavaStatus.letter}
                  </span>
                  {/* N'afficher la position que si le tronc a commencé */}
                  {getEffectiveRustJavaStatus() !== 'track_not_started' && (
                    (student.java_project && student.java_project_position && student.java_project_total) ? (
                      <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {student.java_project_position}/{student.java_project_total}
                      </span>
                    ) : (student.rust_project && student.rust_project_position && student.rust_project_total) ? (
                      <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {student.rust_project_position}/{student.rust_project_total}
                      </span>
                    ) : null
                  )}
                  {getEffectiveRustJavaStatus() === 'track_not_started' ? (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium bg-slate-50 text-slate-400 border-slate-200 italic">
                      Non démarré
                    </div>
                  ) : (
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
              <Button aria-haspopup="true" size="icon" variant="ghost" className="h-8 w-8" disabled={isLoading}>
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
              <DropdownMenuSeparator />
              {isDropout ? (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDropoutAction('reactivate');
                  }}
                  className="cursor-pointer text-green-600 focus:text-green-600"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Réactiver l'étudiant
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDropoutAction('dropout');
                  }}
                  className="cursor-pointer text-orange-600 focus:text-orange-600"
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Marquer en perdition
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {isAlternant ? (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAlternantAction('remove');
                  }}
                  className="cursor-pointer text-gray-600 focus:text-gray-600"
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  Retirer statut alternant
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAlternantAction('set');
                  }}
                  className="cursor-pointer text-blue-600 focus:text-blue-600"
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  Marquer alternant
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 focus:text-red-600">
                <form action={deleteStudent} className="w-full">
                  <button type="submit" className="w-full text-left flex items-center">
                    <span className="mr-2">Supprimer</span>
                  </button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    </>
  );
}
