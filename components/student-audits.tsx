'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Calendar,
  User,
  FileCode,
  Filter,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import Link from 'next/link';

type StudentAudit = {
  auditId: number;
  projectName: string;
  track: string;
  promoId: string;
  promoName: string;
  groupId: string;
  auditorName: string;
  auditDate: string;
  validated: boolean;
  feedback: string | null;
  warnings: string[];
  globalSummary: string | null;
  globalWarnings: string[];
  priority: 'urgent' | 'warning' | 'normal';
};

interface StudentAuditsProps {
  studentId: number;
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-500/10 text-red-700 border-red-500/20';
    case 'warning':
      return 'bg-orange-500/10 text-orange-700 border-orange-500/20';
    default:
      return 'bg-green-500/10 text-green-700 border-green-500/20';
  }
};

const getTrackColor = (track: string) => {
  switch (track) {
    case 'Golang':
      return 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20';
    case 'Javascript':
      return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
    case 'Rust':
      return 'bg-orange-500/10 text-orange-700 border-orange-500/20';
    case 'Java':
      return 'bg-red-500/10 text-red-700 border-red-500/20';
    default:
      return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
  }
};

export function StudentAudits({ studentId }: StudentAuditsProps) {
  const [audits, setAudits] = useState<StudentAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'validated' | 'not-validated'>('all');
  const [filterTrack, setFilterTrack] = useState<string>('all');

  useEffect(() => {
    const fetchAudits = async () => {
      try {
        const response = await fetch(`/api/student/${studentId}/audits`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setAudits(data.audits);
          }
        }
      } catch (error) {
        console.error('Error fetching student audits:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAudits();
  }, [studentId]);

  // Filtrer les audits
  const filteredAudits = audits.filter((audit) => {
    const statusMatch =
      filterStatus === 'all' ||
      (filterStatus === 'validated' && audit.validated) ||
      (filterStatus === 'not-validated' && !audit.validated);

    const trackMatch = filterTrack === 'all' || audit.track === filterTrack;

    return statusMatch && trackMatch;
  });

  // Statistiques
  const totalAudits = audits.length;
  const validatedCount = audits.filter((a) => a.validated).length;
  const validationRate = totalAudits > 0 ? Math.round((validatedCount / totalAudits) * 100) : 0;
  const tracks = [...new Set(audits.map((a) => a.track))];

  if (loading) {
    return (
      <Card className="border-2">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (audits.length === 0) {
    return (
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Code Reviews
          </CardTitle>
          <CardDescription>Historique des audits de code de cet étudiant</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8 text-muted-foreground">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>Aucun audit réalisé pour le moment</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Code Reviews
        </CardTitle>
        <CardDescription>
          {totalAudits} audit{totalAudits > 1 ? 's' : ''} réalisé{totalAudits > 1 ? 's' : ''} • Taux
          de validation: {validationRate}%
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filtres */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="validated">Validés</SelectItem>
                <SelectItem value="not-validated">Non validés</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Select value={filterTrack} onValueChange={setFilterTrack}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Track" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les tracks</SelectItem>
              {tracks.map((track) => (
                <SelectItem key={track} value={track}>
                  {track}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Liste des audits */}
        <div className="space-y-3">
          {filteredAudits.length === 0 ? (
            <div className="text-center p-4 text-sm text-muted-foreground">
              Aucun audit ne correspond aux filtres sélectionnés
            </div>
          ) : (
            filteredAudits.map((audit) => (
              <div
                key={audit.auditId}
                className="p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors group relative"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileCode className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{audit.projectName}</span>
                      <Badge variant="outline" className={getTrackColor(audit.track)}>
                        {audit.track}
                      </Badge>
                      <Badge variant="outline" className={getPriorityColor(audit.priority)}>
                        {audit.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {audit.auditorName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(audit.auditDate), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Validation Status & Link */}
                  <div className="flex items-center gap-2">
                    {audit.validated ? (
                      <Badge
                        variant="outline"
                        className="bg-green-500/10 text-green-700 border-green-500/20"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Validé
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-red-500/10 text-red-700 border-red-500/20"
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Non validé
                      </Badge>
                    )}
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/code-reviews/${audit.promoId}/group/${audit.groupId}`}>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Feedback */}
                {audit.feedback && (
                  <div className="mb-2 p-3 rounded bg-background/50 border">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground font-medium mb-2">
                          Commentaire personnel
                        </p>
                        <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                            {audit.feedback}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Warnings individuels */}
                {audit.warnings.length > 0 && (
                  <div className="mb-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30">
                    <div className="flex items-start gap-2">
                      <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-orange-700 dark:text-orange-400 mb-2">
                          Points d'attention ({audit.warnings.length})
                        </p>
                        <ul className="text-sm space-y-1.5">
                          {audit.warnings.map((warning, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-orange-700 dark:text-orange-400">
                              <span className="text-orange-400 mt-1">•</span>
                              <span className="flex-1">{warning}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Global Summary */}
                {audit.globalSummary && (
                  <div className="mt-2 p-3 rounded bg-blue-500/5 border border-blue-500/20">
                    <p className="text-sm text-blue-700 font-medium mb-2">Compte rendu du groupe</p>
                    <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-headings:text-blue-700 prose-p:text-blue-700 prose-li:text-blue-700">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                        {audit.globalSummary}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Global Warnings */}
                {audit.globalWarnings.length > 0 && (
                  <div className="mt-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
                    <div className="flex items-start gap-2">
                      <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">
                          Problèmes du groupe ({audit.globalWarnings.length})
                        </p>
                        <ul className="text-sm space-y-1.5">
                          {audit.globalWarnings.map((warning, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-red-700 dark:text-red-400">
                              <span className="text-red-400 mt-1">•</span>
                              <span className="flex-1">{warning}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
