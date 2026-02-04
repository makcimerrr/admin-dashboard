import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ClipboardCheck,
  User,
  UserX,
  Calendar,
  Edit
} from 'lucide-react';
import { parsePromoId } from '@/lib/config/promotions';
import { fetchPromotionProgressions } from '@/lib/services/zone01';
import { getDropoutLogins } from '@/lib/db/services/dropouts';
import { db } from '@/lib/db/config';
import { audits } from '@/lib/db/schema/audits';
import { eq } from 'drizzle-orm';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import SaveToastTrigger from '@/components/code-reviews/save-toast-trigger';
import React from 'react';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider
} from '@/components/ui/tooltip';
import MarkdownWithTables from '@/components/code-reviews/markdown-with-tables';

interface PageProps {
  params: Promise<{ promoId: string; groupId: string }>;
}

function initialsFrom(name?: string, login?: string) {
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (login) return login.slice(0, 2).toUpperCase();
  return '??';
}

function safeText(s?: string) {
  return s ? s : '—';
}

export default async function GroupDetailPage({ params }: PageProps) {
  const { promoId, groupId } = await params;
  const promo = parsePromoId(promoId);

  if (!promo) {
    notFound();
  }

  // Trouver l'audit pour ce groupe
  const audit = await db.query.audits.findFirst({
    where: eq(audits.groupId, groupId),
    with: { results: true }
  });

  if (!audit) {
    notFound();
  }

  const track = audit.track;
  const projectName = audit.projectName;

  // Récupérer les données Zone01 et dropouts
  const [progressions, dropoutLogins] = await Promise.all([
    fetchPromotionProgressions(String(promo.eventId)),
    getDropoutLogins()
  ]);

  // Trouver le groupe dans les progressions
  const groupProgressions = progressions.filter(
    (p) =>
      String(p.group.id) === groupId &&
      p.object.name.toLowerCase() === projectName.toLowerCase()
  );

  // Récupérer les IDs des étudiants depuis la DB
  const memberLogins = groupProgressions.map((p) => p.user.login.toLowerCase());
  const studentsData =
    memberLogins.length > 0
      ? await db.query.students.findMany({
          where: (students, { sql }) =>
            sql`LOWER(${students.login}) IN (${sql.join(
              memberLogins.map((l) => sql.raw(`'${l}'`)),
              sql`, `
            )})`
        })
      : [];

  const studentIdByLogin = new Map(
    studentsData.map((s) => [s.login.toLowerCase(), s.id])
  );

  const members = groupProgressions.map((p) => ({
    login: p.user.login,
    firstName: p.user.firstName,
    lastName: p.user.lastName,
    grade: p.grade ?? null,
    isDropout: dropoutLogins.has(p.user.login.toLowerCase()),
    studentId: studentIdByLogin.get(p.user.login.toLowerCase())
  }));

  const resultsByLogin = new Map(
    audit.results.map((r) => [r.studentLogin.toLowerCase(), r])
  );

  // Derived stats
  const validatedCount = audit.results.filter((r) => r.validated).length;
  const absentCount = audit.results.filter((r) => r.absent).length;
  const totalResults = audit.results.length;
  const notValidatedCount = totalResults - validatedCount - absentCount;
  const warningsCount = audit.warnings ? audit.warnings.length : 0;
  const dropoutsCount = members.filter((m) => m.isDropout).length;

  return (
    <div className="p-6 space-y-6">
      <SaveToastTrigger />

      {/* Top header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/code-reviews/${promoId}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{projectName}</h1>
              <p className="text-sm text-muted-foreground">
                Groupe #{groupId} • {promo.key} • {track}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3 bg-muted rounded-lg px-3 py-2">
            <div className="text-sm text-muted-foreground">Statuts</div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <div className="text-sm font-medium">{validatedCount} validé</div>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <div className="text-sm font-medium">{notValidatedCount} non validé</div>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <div className="text-sm font-medium">{warningsCount} warnings</div>
              </div>
              <div className="flex items-center gap-2">
                <UserX className="h-4 w-4 text-orange-500" />
                <div className="text-sm font-medium">{absentCount} absent(s)</div>
              </div>
            </div>
          </div>

          <Button variant="outline" asChild>
            <Link href={`/code-reviews/${promoId}/group/${groupId}/audit`}>
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary + Infos (moved up & summary enlarged) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Compte rendu global</CardTitle>
              <CardDescription className="text-sm">Résumé et notes globales (visible en priorité)</CardDescription>
            </CardHeader>
            <CardContent className="prose prose-lg max-w-none text-base">
              {audit.summary ? (
                <MarkdownWithTables md={audit.summary} />
              ) : (
                <div className="text-sm text-muted-foreground">Aucun compte rendu fourni.</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Infos</CardTitle>
              <CardDescription>Auditeur et métadonnées</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <User className="h-5 w-5" />
                <div className="text-sm">{audit.auditorName}</div>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <Calendar className="h-5 w-5" />
                <div className="text-sm">{format(new Date(audit.createdAt), 'PPP à HH:mm', { locale: fr })}</div>
              </div>

              {/* Members simplified list: name, validated (V/NV), and warning tooltip */}
              <div className="mt-4">
                    <h3 className="text-sm font-medium mb-2">Membres</h3>
                    <div className="space-y-1">
                      {members.map((m) => {
                        const res = resultsByLogin.get(m.login.toLowerCase());
                        const validated = res?.validated === true;
                        const absent = res?.absent === true;
                        const warnings = res?.warnings ?? [];
                        const warningsText = warnings.join('\n');
                        const name = m.firstName || m.lastName ? `${safeText(m.firstName)} ${safeText(m.lastName)}`.trim() : m.login;
                        const href = m.studentId ? `/student?id=${m.studentId}` : undefined;
                        const rowClasses = `flex items-center justify-between text-sm p-2 rounded-md transition-colors ${href ? 'hover:bg-primary/5 cursor-pointer' : 'opacity-80'}`;

                        const content = (
                          <>
                            <div className="flex items-center">
                              {absent ? (
                                <UserX className="h-4 w-4 text-orange-500 mr-2" />
                              ) : (
                                <User className="h-4 w-4 text-muted-foreground mr-2" />
                              )}
                              <div className={`truncate max-w-[12rem] ${absent ? 'text-orange-600' : ''}`}>{name}</div>
                            </div>

                            <div className="flex items-center gap-2">
                              {warnings.length > 0 ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <span className="text-amber-600 text-xs cursor-default" aria-hidden>
                                        ⚠
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      <div className="whitespace-pre-wrap text-xs">{warningsText}</div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : null}

                              {absent ? (
                                <Badge className="bg-orange-100 text-orange-800 text-xs">ABS</Badge>
                              ) : validated ? (
                                <Badge className="bg-green-100 text-green-800 text-xs">V</Badge>
                              ) : (
                                <Badge variant="destructive" className="text-xs">NV</Badge>
                              )}
                            </div>
                          </>
                        );

                        return href ? (
                          <Link key={m.login} href={href} className={rowClasses} aria-label={`Voir la fiche de ${name}`}>
                            {content}
                          </Link>
                        ) : (
                          <div key={m.login} className={rowClasses} aria-hidden>
                            {content}
                          </div>
                        );
                      })}
                    </div>
                  </div>

              {(audit.warnings?.length ?? 0) > 0 ? (
                <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="font-medium text-amber-800 flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    Warnings globaux
                  </p>
                  <ul className="list-disc list-inside text-sm text-amber-700">
                    {audit.warnings?.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              ) : (
                <div className="mt-4 text-sm text-muted-foreground">Aucun warning global.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Student results - always visible feedback (no accordion) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Détails de l'audit ({totalResults})
          </CardTitle>
          <CardDescription>Résultats individuels et commentaires</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {audit.results.length === 0 ? (
            <div className="text-sm text-muted-foreground">Aucun résultat d'audit.</div>
          ) : (
            <div className="space-y-3">
              {audit.results.map((result) => {
                return (
                  <div key={result.id} className="border rounded-lg p-4 bg-white/50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">{initialsFrom(undefined, result.studentLogin)}</div>
                        <div>
                          <div className="font-medium">{result.studentLogin}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {result.absent ? (
                          <Badge className="bg-orange-100 text-orange-800">
                            <UserX className="h-3 w-3 mr-1" />
                            Absent
                          </Badge>
                        ) : result.validated ? (
                          <Badge className="bg-green-100 text-green-800">Validé</Badge>
                        ) : (
                          <Badge variant="destructive">Non validé</Badge>
                        )}
                        {(result.warnings?.length ?? 0) > 0 && (
                          <Badge variant="outline" className="text-amber-700">{result.warnings?.length} W</Badge>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-muted-foreground space-y-2">
                      {result.feedback ? (
                        <MarkdownWithTables md={result.feedback} />
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          Pas de feedback.
                        </div>
                      )}

                      {(result.warnings?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {result.warnings?.map((w, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-xs bg-amber-50 text-amber-700"
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {w}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
