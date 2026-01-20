'use client';

import React, { useEffect, useState } from 'react';
import promoStatus from '../config/promoStatus.json';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Lightbulb, Trophy, Code2, Workflow, CheckCircle2, Users, TrendingUp } from 'lucide-react';

interface PromoStatusDisplayProps {
  selectedPromo: string;
}

interface ProgressStats {
  totalStudents: number;
  onExpectedProject: number;
  percentage: number;
  offProjectStats: {
    ahead: number;
    late: number;
    specialty: number;
    validated: number;
    notValidated: number;
    other: number;
  };
  rustStats?: { total: number; onProject: number };
  javaStats?: { total: number; onProject: number };
}

const PromoStatusDisplay = ({ selectedPromo }: PromoStatusDisplayProps) => {
  const statusData = promoStatus as Record<string, any>;
  const [progressStats, setProgressStats] = useState<ProgressStats | null>(null);
  const [allProgressStats, setAllProgressStats] = useState<Record<string, ProgressStats>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchProgressStats = async () => {
      if (selectedPromo === 'all') {
        // Fetch stats for all promos
        setIsLoading(true);
        const statsMap: Record<string, ProgressStats> = {};

        await Promise.all(
          Object.entries(statusData).map(async ([promoKey, project]) => {
            if (!project || project === 'Fin') return;

            try {
              const projectParam = typeof project === 'string' ? project : JSON.stringify(project);
              const response = await fetch(
                `/api/project-progress-stats?promo=${encodeURIComponent(promoKey)}&project=${encodeURIComponent(projectParam)}`
              );

              if (response.ok) {
                const data = await response.json();
                statsMap[promoKey] = data;
              }
            } catch (error) {
              console.error(`Erreur lors de la récupération des stats pour ${promoKey}:`, error);
            }
          })
        );

        setAllProgressStats(statsMap);
        setProgressStats(null);
        setIsLoading(false);
        return;
      }

      const project = statusData[selectedPromo];
      if (!project || project === 'Fin') {
        setProgressStats(null);
        return;
      }

      setIsLoading(true);
      try {
        const projectParam = typeof project === 'string' ? project : JSON.stringify(project);
        const response = await fetch(
          `/api/project-progress-stats?promo=${encodeURIComponent(selectedPromo)}&project=${encodeURIComponent(projectParam)}`
        );

        if (response.ok) {
          const data = await response.json();
          setProgressStats(data);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgressStats();
  }, [selectedPromo]);

  const getProjectIcon = (project: any) => {
    if (typeof project === 'string' && project.toLowerCase() === 'fin') {
      return <Trophy className="h-5 w-5 text-emerald-500" />;
    }
    if (typeof project === 'object' && project !== null) {
      return <Workflow className="h-5 w-5 text-orange-500" />;
    }
    return <Code2 className="h-5 w-5 text-blue-500" />;
  };

  const renderProject = (project: any, promoKey?: string) => {
    if (typeof project === 'string') {
      if (project.toLowerCase() === 'fin') {
        return (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Trophy className="h-6 w-6 text-emerald-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-emerald-600">Formation Terminée</span>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Validé
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Tous les projets ont été complétés</p>
            </div>
          </div>
        );
      }
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Code2 className="h-6 w-6 text-blue-500" />
            </div>
            <div className="flex-1">
              <span className="text-xl font-bold text-foreground">{project}</span>
              <p className="text-sm text-muted-foreground mt-1">Projet actuel de la promotion</p>
            </div>
          </div>
          {progressStats && (
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Progression</span>
                </div>
                <Badge variant="outline" className="bg-primary/10">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {progressStats.percentage}%
                </Badge>
              </div>
              <Progress value={progressStats.percentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progressStats.onExpectedProject} étudiants sur le projet</span>
                <span>{progressStats.totalStudents} total</span>
              </div>

              {/* Détail des étudiants hors projet */}
              {(progressStats.offProjectStats.ahead > 0 ||
                progressStats.offProjectStats.late > 0 ||
                progressStats.offProjectStats.specialty > 0 ||
                progressStats.offProjectStats.validated > 0 ||
                progressStats.offProjectStats.notValidated > 0 ||
                progressStats.offProjectStats.other > 0) && (
                <div className="pt-3 border-t space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Étudiants hors projet ({progressStats.totalStudents - progressStats.onExpectedProject}) :
                  </p>
                  {progressStats.offProjectStats.ahead > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        <span className="text-blue-600 font-medium">En avance</span>
                      </span>
                      <Badge variant="secondary" className="text-xs h-5 bg-blue-500/10 text-blue-700">
                        {progressStats.offProjectStats.ahead}
                      </Badge>
                    </div>
                  )}
                  {progressStats.offProjectStats.late > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        <span className="text-red-600 font-medium">En retard</span>
                      </span>
                      <Badge variant="secondary" className="text-xs h-5 bg-red-500/10 text-red-700">
                        {progressStats.offProjectStats.late}
                      </Badge>
                    </div>
                  )}
                  {progressStats.offProjectStats.specialty > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-orange-500" />
                        <span className="text-orange-600 font-medium">Spécialité</span>
                      </span>
                      <Badge variant="secondary" className="text-xs h-5 bg-orange-500/10 text-orange-700">
                        {progressStats.offProjectStats.specialty}
                      </Badge>
                    </div>
                  )}
                  {progressStats.offProjectStats.validated > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-emerald-600 font-medium">Validé</span>
                      </span>
                      <Badge variant="secondary" className="text-xs h-5 bg-emerald-500/10 text-emerald-700">
                        {progressStats.offProjectStats.validated}
                      </Badge>
                    </div>
                  )}
                  {progressStats.offProjectStats.notValidated > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-rose-500" />
                        <span className="text-rose-600 font-medium">Non validé</span>
                      </span>
                      <Badge variant="secondary" className="text-xs h-5 bg-rose-500/10 text-rose-700">
                        {progressStats.offProjectStats.notValidated}
                      </Badge>
                    </div>
                  )}
                  {progressStats.offProjectStats.other > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-gray-500" />
                        <span className="text-gray-600 font-medium">Autre</span>
                      </span>
                      <Badge variant="secondary" className="text-xs h-5 bg-gray-500/10 text-gray-700">
                        {progressStats.offProjectStats.other}
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
    if (typeof project === 'object' && project !== null) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Workflow className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Tronc multi-choix</h4>
              <p className="text-xs text-muted-foreground">Les étudiants choisissent entre Rust ou Java</p>
            </div>
          </div>

          {progressStats && (
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Progression globale</span>
                </div>
                <Badge variant="outline" className="bg-primary/10">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {progressStats.percentage}%
                </Badge>
              </div>
              <Progress value={progressStats.percentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progressStats.onExpectedProject} étudiants sur un projet attendu</span>
                <span>{progressStats.totalStudents} total</span>
              </div>

              {/* Détail des étudiants hors projet */}
              {(progressStats.offProjectStats.ahead > 0 ||
                progressStats.offProjectStats.late > 0 ||
                progressStats.offProjectStats.specialty > 0 ||
                progressStats.offProjectStats.validated > 0 ||
                progressStats.offProjectStats.notValidated > 0 ||
                progressStats.offProjectStats.other > 0) && (
                <div className="pt-3 border-t space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Étudiants hors projet ({progressStats.totalStudents - progressStats.onExpectedProject}) :
                  </p>
                  {progressStats.offProjectStats.ahead > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        <span className="text-blue-600 font-medium">En avance</span>
                      </span>
                      <Badge variant="secondary" className="text-xs h-5 bg-blue-500/10 text-blue-700">
                        {progressStats.offProjectStats.ahead}
                      </Badge>
                    </div>
                  )}
                  {progressStats.offProjectStats.late > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        <span className="text-red-600 font-medium">En retard</span>
                      </span>
                      <Badge variant="secondary" className="text-xs h-5 bg-red-500/10 text-red-700">
                        {progressStats.offProjectStats.late}
                      </Badge>
                    </div>
                  )}
                  {progressStats.offProjectStats.specialty > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-orange-500" />
                        <span className="text-orange-600 font-medium">Spécialité</span>
                      </span>
                      <Badge variant="secondary" className="text-xs h-5 bg-orange-500/10 text-orange-700">
                        {progressStats.offProjectStats.specialty}
                      </Badge>
                    </div>
                  )}
                  {progressStats.offProjectStats.validated > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-emerald-600 font-medium">Validé</span>
                      </span>
                      <Badge variant="secondary" className="text-xs h-5 bg-emerald-500/10 text-emerald-700">
                        {progressStats.offProjectStats.validated}
                      </Badge>
                    </div>
                  )}
                  {progressStats.offProjectStats.notValidated > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-rose-500" />
                        <span className="text-rose-600 font-medium">Non validé</span>
                      </span>
                      <Badge variant="secondary" className="text-xs h-5 bg-rose-500/10 text-rose-700">
                        {progressStats.offProjectStats.notValidated}
                      </Badge>
                    </div>
                  )}
                  {progressStats.offProjectStats.other > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-gray-500" />
                        <span className="text-gray-600 font-medium">Autre</span>
                      </span>
                      <Badge variant="secondary" className="text-xs h-5 bg-gray-500/10 text-gray-700">
                        {progressStats.offProjectStats.other}
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-3">
            <div className="space-y-2 p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-1 bg-cyan-500 rounded-full" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-cyan-600 mb-1">Tronc Rust</div>
                  <div className="text-lg font-bold text-foreground">{project.rust || 'N/A'}</div>
                </div>
                {progressStats?.rustStats && (
                  <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-700">
                    {progressStats.rustStats.onProject} étudiants
                  </Badge>
                )}
              </div>
              {progressStats?.rustStats && (
                <Progress
                  value={Math.round((progressStats.rustStats.onProject / progressStats.rustStats.total) * 100)}
                  className="h-1.5"
                />
              )}
            </div>

            <div className="space-y-2 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-1 bg-red-500 rounded-full" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-red-600 mb-1">Tronc Java</div>
                  <div className="text-lg font-bold text-foreground">{project.java || 'N/A'}</div>
                </div>
                {progressStats?.javaStats && (
                  <Badge variant="secondary" className="bg-red-500/10 text-red-700">
                    {progressStats.javaStats.onProject} étudiants
                  </Badge>
                )}
              </div>
              {progressStats?.javaStats && (
                <Progress
                  value={Math.round((progressStats.javaStats.onProject / progressStats.javaStats.total) * 100)}
                  className="h-1.5"
                />
              )}
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gray-500/10 rounded-lg">
          <Code2 className="h-6 w-6 text-gray-500" />
        </div>
        <span className="text-xl font-semibold text-muted-foreground">Aucune information disponible</span>
      </div>
    );
  };

  const renderAllPromos = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Object.entries(statusData).map(([promo, project]) => {
        const stats = allProgressStats[promo];
        const isFin = typeof project === 'string' && project.toLowerCase() === 'fin';

        return (
          <Card key={promo} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3 bg-gradient-to-br from-muted/50 to-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getProjectIcon(project)}
                  <CardTitle className="text-base">{promo}</CardTitle>
                </div>
                {stats && !isFin && (
                  <Badge
                    variant="outline"
                    className={`text-xs font-bold ${
                      stats.percentage >= 80
                        ? 'bg-green-500/10 text-green-700 border-green-300'
                        : stats.percentage >= 50
                        ? 'bg-yellow-500/10 text-yellow-700 border-yellow-300'
                        : 'bg-red-500/10 text-red-700 border-red-300'
                    }`}
                  >
                    {stats.percentage}%
                  </Badge>
                )}
                {isFin && (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-300 text-xs font-bold">
                    100%
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {typeof project === 'string' ? (
                project.toLowerCase() === 'fin' ? (
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-emerald-500" />
                    <span className="font-semibold text-emerald-600">Formation Terminée</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Code2 className="h-5 w-5 text-blue-500" />
                      <span className="font-medium">{project}</span>
                    </div>
                    {stats && (
                      <div className="space-y-1">
                        <Progress value={stats.percentage} className="h-1.5" />
                        <p className="text-xs text-muted-foreground">
                          {stats.onExpectedProject}/{stats.totalStudents} étudiants
                        </p>
                      </div>
                    )}
                  </div>
                )
              ) : typeof project === 'object' && project !== null ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Workflow className="h-5 w-5 text-orange-500" />
                    <span className="text-sm font-medium text-muted-foreground">Multi-choix</span>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-600 font-medium">Rust:</span>
                      <span>{project.rust || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-red-600 font-medium">Java:</span>
                      <span>{project.java || 'N/A'}</span>
                    </div>
                  </div>
                  {stats && (
                    <div className="space-y-1 pt-1">
                      <Progress value={stats.percentage} className="h-1.5" />
                      <p className="text-xs text-muted-foreground">
                        {stats.onExpectedProject}/{stats.totalStudents} étudiants
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground">Aucune info</span>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const renderSinglePromo = () => {
    const project = statusData[selectedPromo];
    if (!project) {
      return (
        <div className="flex items-center gap-3 p-6 bg-muted/30 rounded-lg">
          <Code2 className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">Aucune information de statut disponible pour cette promotion.</p>
        </div>
      );
    }
    return <div>{renderProject(project, selectedPromo)}</div>;
  };

  return (
    <Card className="mb-6 border-2 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Lightbulb className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">
              {selectedPromo === 'all' ? 'Projets Attendus Actuels' : `Projet Attendu - ${selectedPromo}`}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedPromo === 'all'
                ? 'Vue d\'ensemble des projets en cours pour toutes les promotions'
                : 'Projet sur lequel les étudiants devraient travailler actuellement'}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {selectedPromo === 'all' ? renderAllPromos() : renderSinglePromo()}
      </CardContent>
    </Card>
  );
};

export default PromoStatusDisplay;
