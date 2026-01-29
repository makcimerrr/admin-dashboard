'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  Mail,
  Calendar,
  Code2,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Github,
  Target,
  Activity,
  Briefcase,
  Building2,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { StudentAudits } from '@/components/student-audits';
import { StudentPendingAudits } from '@/components/student-pending-audits';
import promoConfigData from '../../../config/promoConfig.json'

type Student = {
  id: number;
  login: string;
  first_name: string;
  last_name: string;
  promoName: string;
  availableAt: string;
  delay_level: string | null;
  actual_project_name: string | null;
  progress_status: string | null;
  golang_project: string | null;
  golang_project_status: string | null;
  golang_completed: boolean | null;
  javascript_project: string | null;
  javascript_project_status: string | null;
  javascript_completed: boolean | null;
  rust_project: string | null;
  rust_project_status: string | null;
  rust_completed: boolean | null;
  java_project: string | null;
  java_project_status: string | null;
  java_completed: boolean | null;
  // Champs alternant
  isAlternant: boolean | null;
  alternantStartDate: string | null;
  alternantEndDate: string | null;
  companyName: string | null;
  companyContact: string | null;
  companyEmail: string | null;
  companyPhone: string | null;
};

type Project = {
  id: number;
  student_id: number;
  project_name: string;
  progress_status: string | null;
  delay_level: string | null;
};

type ExternalUserData = {
  id: number;
  login: string;
  firstName: string;
  lastName: string;
  auditRatio: number;
  auditsAssigned: number;
  campus: string;
  email: string;
  githubId: string;
  last_login: string;
  last_contribution: string;
};

const getDelayLevelClass = (level: string | null) => {
  switch (level) {
    case 'bien':
      return 'bg-green-500/10 text-green-700 border-green-500/20';
    case 'en retard':
      return 'bg-red-500/10 text-red-700 border-red-500/20';
    case 'en avance':
      return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
    case 'spécialité':
      return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
    case 'Validé':
      return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20';
    case 'Non Validé':
      return 'bg-rose-500/10 text-rose-700 border-rose-500/20';
    default:
      return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
  }
};

const getProgressStatusBadge = (status: string | null) => {
  switch (status) {
    case 'finished':
      return { text: 'Terminé', className: 'bg-green-500/10 text-green-700 border-green-500/20' };
    case 'working':
      return { text: 'En cours', className: 'bg-blue-500/10 text-blue-700 border-blue-500/20' };
    case 'audit':
      return { text: 'Audit', className: 'bg-orange-500/10 text-orange-700 border-orange-500/20' };
    case 'setup':
      return { text: 'Configuration', className: 'bg-purple-500/10 text-purple-700 border-purple-500/20' };
    case 'without group':
      return { text: 'Sans groupe', className: 'bg-red-500/10 text-red-700 border-red-500/20' };
    default:
      return { text: status || 'Inconnu', className: 'bg-gray-500/10 text-gray-700 border-gray-500/20' };
  }
};

export default function StudentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentId = searchParams.get('id');

  const [student, setStudent] = useState<Student | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [externalData, setExternalData] = useState<ExternalUserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingExternal, setLoadingExternal] = useState(false);
  const [loadingAlternant, setLoadingAlternant] = useState(false);

  useEffect(() => {
    if (!studentId) {
      router.push('/students');
      return;
    }

    const fetchStudentData = async () => {
      try {
        const response = await fetch(`/api/student/${studentId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setStudent(data.student);
            setProjects(data.projects);
            // Charger automatiquement les données externes
            fetchExternalDataInternal(data.student.login);
          }
        } else {
          toast.error('Étudiant introuvable');
          router.push('/students');
        }
      } catch (error) {
        console.error('Error fetching student data:', error);
        toast.error('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [studentId, router]);

  const fetchExternalDataInternal = async (login: string) => {
    setLoadingExternal(true);
    try {
      const [giteaResponse, userFindResponse] = await Promise.all([
        fetch(
          `https://api-zone01-rouen.deno.dev/api/v1/gitea-info/${login}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_ACCESS_TOKEN}`,
            },
          }
        ),
        fetch(
          `https://api-zone01-rouen.deno.dev/api/v1/user-info/${login}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_ACCESS_TOKEN}`,
            },
          }
        ),
      ]);

      if (!giteaResponse.ok || !userFindResponse.ok) {
        throw new Error('Failed to fetch external data');
      }

      const giteaData = await giteaResponse.json();
      const userFindData = await userFindResponse.json();

      let timeMessage = 'Aucune contribution';

      if (Array.isArray(giteaData.heatmap) && giteaData.heatmap.length > 0) {
        const latestDate = giteaData.heatmap.reduce(
          (latest: { timestamp: number }, current: { timestamp: number }) =>
            current.timestamp > latest.timestamp ? current : latest
        );

        timeMessage = formatDistanceToNow(
          new Date(latestDate.timestamp * 1000),
          { locale: fr }
        );
      }

      const userData = {
        id: userFindData.user[0].id,
        login: userFindData.user[0].login,
        firstName: userFindData.user[0].firstName,
        lastName: userFindData.user[0].lastName,
        auditRatio: userFindData.user[0].auditRatio,
        auditsAssigned: userFindData.user[0].auditsAssigned,
        campus: userFindData.user[0].campus,
        email: userFindData.user[0].email,
        githubId: userFindData.user[0].githubId,
        last_login: giteaData.user.last_login,
        last_contribution: timeMessage,
      };

      setExternalData(userData);
    } catch (error) {
      console.error('Error fetching external data:', error);
    } finally {
      setLoadingExternal(false);
    }
  };

  const toggleAlternantStatus = async (isAlternant: boolean) => {
    if (!student) return;

    setLoadingAlternant(true);
    try {
      const response = await fetch('/api/alternants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentLogin: student.login,
          isAlternant,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setStudent((prev) =>
          prev ? { ...prev, isAlternant } : null
        );
        toast.success(
          isAlternant
            ? 'Étudiant marqué comme alternant'
            : 'Statut alternant retiré'
        );
      } else {
        toast.error(data.error || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Error toggling alternant status:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoadingAlternant(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Étudiant introuvable</p>
        <Button onClick={() => router.push('/students')}>
          Retour à la liste
        </Button>
      </div>
    );
  }

  // Récupérer la config de la promo pour vérifier les dates de début des troncs
  const studentPromoConfig = (promoConfigData as any[]).find(p => p.key === student.promoName);
  const today = new Date();

  // Vérifier si le tronc Javascript a commencé
  const jsStartDate = studentPromoConfig?.dates['piscine-js-start'];
  const jsHasStarted = jsStartDate && jsStartDate !== 'NaN' && !isNaN(new Date(jsStartDate).getTime()) && today >= new Date(jsStartDate);

  // Vérifier si le tronc Rust/Java a commencé
  const rustJavaStartDate = studentPromoConfig?.dates['piscine-rust-java-start'];
  const rustJavaHasStarted = rustJavaStartDate && rustJavaStartDate !== 'NaN' && !isNaN(new Date(rustJavaStartDate).getTime()) && today >= new Date(rustJavaStartDate);

  // Déterminer quel tronc (Rust ou Java) afficher - priorité à celui qui a des données
  const rustJavaTrack = (() => {
    // Si Rust a un projet ou est complété, utiliser Rust
    if (student.rust_project || student.rust_completed) {
      return {
        name: 'Rust',
        project: student.rust_project,
        status: student.rust_project_status,
        completed: student.rust_completed,
        color: 'orange',
      };
    }
    // Sinon, utiliser Java (même si vide)
    return {
      name: 'Java',
      project: student.java_project,
      status: student.java_project_status,
      completed: student.java_completed,
      color: 'red',
    };
  })();

  // Déterminer le statut effectif du projet JS en fonction de si le tronc a commencé
  const getEffectiveJsStatus = () => {
    if (!jsHasStarted && studentPromoConfig) {
      // Le tronc n'a pas commencé
      if (student.javascript_project_status === 'without group' ||
          student.javascript_project_status === 'not_started' ||
          !student.javascript_project_status) {
        return null; // On retournera null pour ne pas afficher ce track
      }
    }
    return student.javascript_project_status;
  };

  // Déterminer le statut effectif du projet Rust/Java en fonction de si le tronc a commencé
  const getEffectiveRustJavaStatus = () => {
    if (!rustJavaHasStarted && studentPromoConfig) {
      // Le tronc n'a pas commencé
      const rawStatus = student.java_project_status || student.rust_project_status;
      if (rawStatus === 'without group' ||
          rawStatus === 'not_started' ||
          rawStatus === 'not_chosen' ||
          !rawStatus) {
        return null; // On retournera null pour ne pas afficher ce track
      }
    }
    return rustJavaTrack.status;
  };

  const jsStatus = getEffectiveJsStatus();
  const rustJavaStatus = getEffectiveRustJavaStatus();

  const tracks = [
    {
      name: 'Golang',
      project: student.golang_project,
      status: student.golang_project_status,
      completed: student.golang_completed,
      color: 'cyan',
      shouldDisplay: true,
    },
    {
      name: 'Javascript',
      project: jsStatus !== null ? student.javascript_project : null,
      status: jsStatus,
      completed: student.javascript_completed,
      color: 'yellow',
      shouldDisplay: jsStatus !== null,
    },
    {
      ...rustJavaTrack,
      status: rustJavaStatus,
      shouldDisplay: rustJavaStatus !== null,
    },
  ].filter(track => track.shouldDisplay);

  const totalTracksToDisplay = tracks.length;
  const completedTracks = tracks.filter((track) => track.completed).length;
  const progressPercentage = totalTracksToDisplay > 0 ? (completedTracks / totalTracksToDisplay) * 100 : 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/students')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-16 w-16 border-2 border-border">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xl">
              {student.first_name[0]}
              {student.last_name[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {student.first_name} {student.last_name}
            </h1>
            <p className="text-muted-foreground font-mono text-sm">
              @{student.login}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={`text-sm px-3 py-1 ${getDelayLevelClass(student.delay_level)}`}
        >
          {student.delay_level || 'Statut inconnu'}
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingExternal ? (
              <Skeleton className="h-4 w-full" />
            ) : externalData?.email ? (
              <div className="text-sm font-medium truncate">{externalData.email}</div>
            ) : (
              <div className="text-sm text-muted-foreground">Non disponible</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promotion</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">{student.promoName}</div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dernière MAJ</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {new Date(student.availableAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progression</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {completedTracks}/{totalTracksToDisplay}
            </div>
            <p className="text-xs text-muted-foreground">Troncs complétés</p>
          </CardContent>
        </Card>
      </div>

      {/* Progression Overview */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Progression Générale
          </CardTitle>
          <CardDescription>
            Vue d'ensemble de la progression sur les différents troncs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progression totale</span>
              <span className="text-muted-foreground">
                {progressPercentage.toFixed(0)}%
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Tracks Progress */}
      <div className="grid gap-4 md:grid-cols-2">
        {tracks.map((track) => (
          <Card key={track.name} className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Code2 className={`h-5 w-5 text-${track.color}-600`} />
                  {track.name}
                </span>
                {track.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {track.project ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Projet actuel
                    </span>
                    <Badge variant="outline" className="font-mono">
                      {track.project}
                    </Badge>
                  </div>
                  {track.status && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Statut</span>
                      <Badge
                        variant="outline"
                        className={getProgressStatusBadge(track.status).className}
                      >
                        {getProgressStatusBadge(track.status).text}
                      </Badge>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Complétion</span>
                    <span
                      className={`text-sm font-medium ${
                        track.completed ? 'text-green-600' : 'text-orange-600'
                      }`}
                    >
                      {track.completed ? 'Complété' : 'En cours'}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucun projet en cours
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* External Data Section */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Données Externes
          </CardTitle>
          <CardDescription>
            Informations provenant de l'API Zone01 et Gitea
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingExternal ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
              </div>
            </div>
          ) : externalData ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Campus</span>
                  <span className="text-sm font-medium">{externalData.campus}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Audit Ratio</span>
                  <span className="text-sm font-medium">
                    {externalData.auditRatio.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Audits Assignés</span>
                  <span className="text-sm font-medium">
                    {externalData.auditsAssigned}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">GitHub ID</span>
                  <span className="text-sm font-medium font-mono">
                    {externalData.githubId}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Dernière connexion
                  </span>
                  <span className="text-sm font-medium">
                    {new Date(externalData.last_login).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Dernière contribution
                  </span>
                  <span className="text-sm font-medium">
                    {externalData.last_contribution}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center p-4 text-sm text-muted-foreground">
              Impossible de charger les données externes
            </div>
          )}
        </CardContent>
      </Card>

      {/* Projects List */}
      {projects.length > 0 && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Historique des Projets
            </CardTitle>
            <CardDescription>
              Liste de tous les projets de l'étudiant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex-1">
                    <p className="font-medium">{project.project_name}</p>
                    {project.progress_status && (
                      <p className="text-sm text-muted-foreground">
                        {getProgressStatusBadge(project.progress_status).text}
                      </p>
                    )}
                  </div>
                  {project.delay_level && (
                    <Badge
                      variant="outline"
                      className={getDelayLevelClass(project.delay_level)}
                    >
                      {project.delay_level}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Audits Section */}
      <StudentPendingAudits studentId={student.id} />

      {/* Code Reviews Section */}
      <StudentAudits studentId={student.id} />

      {/* Alternant Section */}
      <Card className="border-2 bg-gradient-to-br from-orange-50/50 to-amber-50/50 dark:from-orange-950/20 dark:to-amber-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Alternance
          </CardTitle>
          <CardDescription>
            Gérer le statut d'alternance de cet étudiant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="alternant-switch" className="text-base font-medium">
                Statut Alternant
              </Label>
              <p className="text-sm text-muted-foreground">
                Activer si l'étudiant est en alternance
              </p>
            </div>
            <div className="flex items-center gap-2">
              {loadingAlternant && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              <Switch
                id="alternant-switch"
                checked={student.isAlternant || false}
                onCheckedChange={toggleAlternantStatus}
                disabled={loadingAlternant}
              />
            </div>
          </div>

          {student.isAlternant && (
            <>
              <div className="border-t pt-4 space-y-3">
                {student.companyName && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{student.companyName}</span>
                  </div>
                )}
                {(student.alternantStartDate || student.alternantEndDate) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {student.alternantStartDate &&
                      new Date(student.alternantStartDate).toLocaleDateString('fr-FR')}
                    {' - '}
                    {student.alternantEndDate
                      ? new Date(student.alternantEndDate).toLocaleDateString('fr-FR')
                      : 'En cours'}
                  </div>
                )}
                {student.companyContact && (
                  <div className="text-sm text-muted-foreground">
                    Contact: {student.companyContact}
                    {student.companyEmail && (
                      <a
                        href={`mailto:${student.companyEmail}`}
                        className="ml-2 text-primary hover:underline"
                      >
                        {student.companyEmail}
                      </a>
                    )}
                  </div>
                )}
              </div>
              <div className="border-t pt-4">
                <Link href={`/alternants?student=${student.id}`}>
                  <Button variant="outline" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Gérer les contrats et documents
                  </Button>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Contact Actions */}
      <Card className="border-2 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20">
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>
            Contacter ou effectuer des actions sur cet étudiant
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button
            className="flex-1"
            disabled={!externalData?.email}
            onClick={() => {
              if (externalData?.email) {
                window.open(`mailto:${externalData.email}`, '_blank');
              }
            }}
          >
            <Mail className="h-4 w-4 mr-2" />
            {externalData?.email ? 'Envoyer un email' : 'Charger les données pour l\'email'}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() =>
              window.open(`https://github.com/${externalData?.githubId || student.login}`, '_blank')
            }
          >
            <Github className="h-4 w-4 mr-2" />
            Voir GitHub
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
