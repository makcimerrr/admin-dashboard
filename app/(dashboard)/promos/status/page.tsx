"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Loader2,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Code2,
  Workflow,
  Trophy,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AlertsPanel from "@/components/alerts-panel";

type PromoStatus = {
  promoKey: string;
  promotionName: string;
  currentProject?: string | null;
  progress?: number;
  agenda?: string[];
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  lastUpdated?: string;
};

type PromoStats = {
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
};

function tryParseJSON(value: string | null | undefined): any {
  if (!value) return value;
  try { return JSON.parse(value); } catch { return value; }
}

export default function PromosPage() {
  const [promos, setPromos] = useState<PromoStatus[]>([]);
  const [promoStats, setPromoStats] = useState<Record<string, PromoStats>>({});
  const [promoConfigMap, setPromoConfigMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statusResponse, configResponse] = await Promise.all([
          fetch("/api/promos/status"),
          fetch("/api/promotions"),
        ]);
        const statusData = await statusResponse.json();
        const configData = await configResponse.json();

        if (configData.success) {
          const map: Record<string, number> = {};
          for (const p of configData.promotions) map[p.key] = p.eventId;
          setPromoConfigMap(map);
        }

        if (statusData.success) {
          setPromos(statusData.promos);

          // Fetch stats for each promo
          const statsPromises = statusData.promos.map(async (promo: PromoStatus) => {
            const expectedProject = tryParseJSON(promo.currentProject);
            if (!expectedProject || (typeof expectedProject === 'string' && expectedProject.toLowerCase() === "fin")) return null;

            try {
              const projectParam =
                typeof expectedProject === "string"
                  ? expectedProject
                  : JSON.stringify(expectedProject);
              const response = await fetch(
                `/api/project-progress-stats?promo=${encodeURIComponent(
                  promo.promoKey
                )}&project=${encodeURIComponent(projectParam)}`
              );
              if (response.ok) {
                const data = await response.json();
                return { promoKey: promo.promoKey, stats: data };
              }
            } catch (error) {
              console.error(`Error fetching stats for ${promo.promoKey}:`, error);
            }
            return null;
          });

          const statsResults = await Promise.all(statsPromises);
          const statsMap: Record<string, PromoStats> = {};
          statsResults.forEach((result) => {
            if (result) {
              statsMap[result.promoKey] = result.stats;
            }
          });
          setPromoStats(statsMap);
        }
      } catch (error) {
        console.error("Error fetching promo data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Trier les promos par eventId
  const sortedPromos = [...promos].sort((a, b) => {
    return (promoConfigMap[a.promoKey] || 0) - (promoConfigMap[b.promoKey] || 0);
  });

  const okPromos = sortedPromos.filter((p) => p.status === "OK");
  const issuePromos = sortedPromos.filter((p) => p.status !== "OK");
  const avgProgress =
    sortedPromos.length > 0
      ? Math.round(
          sortedPromos.reduce((acc, p) => acc + (p.progress || 0), 0) / sortedPromos.length
        )
      : 0;

  const totalStudents = Object.values(promoStats).reduce(
    (acc, stat) => acc + stat.totalStudents,
    0
  );

  return (
    <div className="page-container flex flex-col gap-4 md:gap-6 p-4 md:p-6">
      <PageHeader
        icon={BarChart3}
        title="Statut des Promotions"
        description="Suivi en temps réel de l'avancement et de la santé de chaque promotion"
      />

      {loading ? (
        <PageSkeleton variant="cards" />
      ) : (
        <>
          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Promotions</CardTitle>
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-3xl font-bold">{promos.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Promotions actives</p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Étudiants Total</CardTitle>
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Users className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-3xl font-bold">{totalStudents}</div>
                <p className="text-xs text-muted-foreground mt-1">Toutes promos confondues</p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">En Santé</CardTitle>
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-3xl font-bold text-green-600">{okPromos.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {((okPromos.length / promos.length) * 100).toFixed(0)}% des promotions
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Progression Moyenne</CardTitle>
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-3xl font-bold">{avgProgress}%</div>
                <Progress value={avgProgress} className="h-1.5 mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Alerts Section */}
          <AlertsPanel />

          {/* Tabs for filtering */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full sm:w-auto grid-cols-3">
              <TabsTrigger value="all" className="gap-2">
                <Calendar className="h-4 w-4" />
                Toutes <span className="hidden sm:inline">({promos.length})</span>
              </TabsTrigger>
              <TabsTrigger value="ok" className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Santé <span className="hidden sm:inline">({okPromos.length})</span>
              </TabsTrigger>
              <TabsTrigger value="issues" className="gap-2">
                <AlertCircle className="h-4 w-4" />
                Attention <span className="hidden sm:inline">({issuePromos.length})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4 mt-6">
              {sortedPromos.map((promo) => (
                <PromoCard key={promo.promoKey} promo={promo} stats={promoStats[promo.promoKey]} />
              ))}
            </TabsContent>

            <TabsContent value="ok" className="space-y-4 mt-6">
              {okPromos.length > 0 ? (
                okPromos.map((promo) => (
                  <PromoCard key={promo.promoKey} promo={promo} stats={promoStats[promo.promoKey]} />
                ))
              ) : (
                <Card className="border-dashed border-2">
                  <CardContent className="p-12 text-center">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Aucune promotion avec statut OK</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="issues" className="space-y-4 mt-6">
              {issuePromos.length > 0 ? (
                issuePromos.map((promo) => (
                  <PromoCard key={promo.promoKey} promo={promo} stats={promoStats[promo.promoKey]} />
                ))
              ) : (
                <Card className="border-dashed border-2">
                  <CardContent className="p-12 text-center">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-muted-foreground">
                      Toutes les promotions sont en bonne santé !
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function PromoCard({ promo, stats }: { promo: PromoStatus; stats?: PromoStats }) {
  const expectedProject = tryParseJSON(promo.currentProject);
  const isMultiTrack = typeof expectedProject === "object" && expectedProject !== null;
  const isFinished = typeof expectedProject === "string" && expectedProject.toLowerCase() === "fin";

  const getProjectIcon = () => {
    if (isFinished) return <Trophy className="h-5 w-5 text-emerald-500" />;
    if (isMultiTrack) return <Workflow className="h-5 w-5 text-orange-500" />;
    return <Code2 className="h-5 w-5 text-blue-500" />;
  };

  const getProjectBadge = () => {
    if (isFinished) {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
          <Trophy className="h-3 w-3 mr-1" />
          Formation Terminée
        </Badge>
      );
    }
    if (isMultiTrack) {
      return (
        <Badge variant="outline" className="bg-orange-500/10 text-orange-700 border-orange-500/20">
          <Workflow className="h-3 w-3 mr-1" />
          Multi-tronc
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20">
        <Code2 className="h-3 w-3 mr-1" />
        En cours
      </Badge>
    );
  };

  return (
    <Card className="hover:shadow-xl transition-all border-2 group">
      <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/20">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              isFinished ? 'bg-emerald-500/10' :
              isMultiTrack ? 'bg-orange-500/10' :
              'bg-blue-500/10'
            }`}>
              {getProjectIcon()}
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl group-hover:text-primary transition-colors">
                {promo.promotionName}
              </CardTitle>
              {promo.currentProject && typeof promo.currentProject === 'string' && !isMultiTrack && (
                <CardDescription className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Projet : <span className="font-medium text-foreground">{promo.currentProject}</span>
                </CardDescription>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Badge variant={promo.status === "OK" ? "default" : "destructive"} className="shadow-sm">
              {promo.status}
            </Badge>
            {getProjectBadge()}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* Expected Project */}
        {expectedProject && !isFinished && (
          <div className="p-4 bg-muted/30 rounded-lg border">
            <p className="text-sm font-medium text-muted-foreground mb-2">Projet Attendu</p>
            {isMultiTrack ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-2 bg-cyan-500/5 border border-cyan-500/20 rounded">
                  <div className="h-8 w-1 bg-cyan-500 rounded-full" />
                  <div>
                    <div className="text-xs text-cyan-600 font-medium">Rust</div>
                    <div className="text-sm font-bold">{expectedProject.rust || "N/A"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-red-500/5 border border-red-500/20 rounded">
                  <div className="h-8 w-1 bg-red-500 rounded-full" />
                  <div>
                    <div className="text-xs text-red-600 font-medium">Java</div>
                    <div className="text-sm font-bold">{expectedProject.java || "N/A"}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2 bg-blue-500/5 border border-blue-500/20 rounded">
                <Code2 className="h-4 w-4 text-blue-600" />
                <span className="text-lg font-bold">{expectedProject}</span>
              </div>
            )}
          </div>
        )}

        {/* Stats Section */}
        {stats && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Progression des Étudiants</span>
              </div>
              <Badge variant="outline" className="bg-primary/10">
                <TrendingUp className="h-3 w-3 mr-1" />
                {stats.percentage}%
              </Badge>
            </div>
            <Progress value={stats.percentage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{stats.onExpectedProject} sur le projet attendu</span>
              <span>{stats.totalStudents} étudiants total</span>
            </div>

            {/* Off-project breakdown */}
            {stats.totalStudents > stats.onExpectedProject && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t">
                {stats.offProjectStats.ahead > 0 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-blue-600 font-medium">Avance: {stats.offProjectStats.ahead}</span>
                  </div>
                )}
                {stats.offProjectStats.late > 0 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-red-600 font-medium">Retard: {stats.offProjectStats.late}</span>
                  </div>
                )}
                {stats.offProjectStats.specialty > 0 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="h-2 w-2 rounded-full bg-orange-500" />
                    <span className="text-orange-600 font-medium">Spé: {stats.offProjectStats.specialty}</span>
                  </div>
                )}
                {stats.offProjectStats.validated > 0 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-emerald-600 font-medium">Validé: {stats.offProjectStats.validated}</span>
                  </div>
                )}
                {stats.offProjectStats.notValidated > 0 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="h-2 w-2 rounded-full bg-rose-500" />
                    <span className="text-rose-600 font-medium">Non validé: {stats.offProjectStats.notValidated}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Progress (from promo status) */}
        {promo.progress !== undefined && !stats && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progression</span>
              <span className="font-bold">{promo.progress}%</span>
            </div>
            <Progress value={promo.progress} className="h-2" />
          </div>
        )}

        {/* Dates */}
        {(promo.startDate || promo.endDate) && (
          <div className="flex flex-wrap gap-4 text-sm p-3 bg-muted/20 rounded-lg">
            {promo.startDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-600" />
                <span className="text-muted-foreground">Début :</span>
                <span className="font-medium">
                  {new Date(promo.startDate).toLocaleDateString("fr-FR")}
                </span>
              </div>
            )}
            {promo.endDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-red-600" />
                <span className="text-muted-foreground">Fin :</span>
                <span className="font-medium">
                  {new Date(promo.endDate).toLocaleDateString("fr-FR")}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button asChild variant="outline" className="flex-1 group/btn">
            <Link href={`/students?promo=${encodeURIComponent(promo.promoKey)}`}>
              <Users className="h-4 w-4 mr-2" />
              Voir les étudiants
              <ArrowRight className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
            </Link>
          </Button>
          {stats && (
            <Button asChild variant="outline" size="icon">
              <Link href={`/analytics?promo=${encodeURIComponent(promo.promoKey)}`}>
                <BarChart3 className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
