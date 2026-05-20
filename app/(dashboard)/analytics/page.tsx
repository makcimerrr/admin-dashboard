'use client';

import React, { useState, useEffect } from 'react';
import PieChart from '@/components/pie-chart-student';
import BarChartStacked from '@/components/bar-chart-student-stacked';
import TrackComparisonChart from '@/components/charts/track-comparison-chart';
import DelayDistributionChart from '@/components/charts/delay-distribution-chart';
import { AnalyticsKpiStrip } from '@/components/analytics/kpi-strip';
import { BarChart3, Activity, Target, Layers, GraduationCap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/ui/empty-state';

export default function AnalyticsPage() {
  const [selectedPromo, setSelectedPromo] = useState<string>('all');
  const [promos, setPromos] = useState<{ key: string; title: string; eventId: number }[]>([]);

  useEffect(() => {
    fetch('/api/promotions/active')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setPromos(data.promotions);
      })
      .catch(() => {});
  }, []);

  const filteredPromos =
    selectedPromo === 'all' ? promos : promos.filter((p) => p.key === selectedPromo);

  return (
    <div className="page-container flex flex-col gap-4 md:gap-6 p-4 md:p-6">
      <PageHeader
        icon={BarChart3}
        title="Analytics"
        description="Suivez les métriques clés et les statistiques pour chaque promotion"
      >
        <Select value={selectedPromo} onValueChange={setSelectedPromo}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Toutes les promos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les promotions</SelectItem>
            {promos.map((promo) => (
              <SelectItem key={promo.key} value={promo.key}>
                {promo.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      {/* KPI strip — derives from existing endpoints, follows the promo filter */}
      <AnalyticsKpiStrip promoKey={selectedPromo} activePromos={promos.length} />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:w-fit">
          <TabsTrigger value="overview" className="gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Vue d'ensemble</span>
            <span className="sm:hidden">Global</span>
          </TabsTrigger>
          <TabsTrigger value="per-promo" className="gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Par promotion</span>
            <span className="sm:hidden">Promos</span>
          </TabsTrigger>
          <TabsTrigger value="comparison" className="gap-1.5">
            <Target className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Comparaisons</span>
            <span className="sm:hidden">Compare</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Vue d'ensemble : 2 cards globaux (suit le filtre) ──────────── */}
        <TabsContent value="overview" className="space-y-4 mt-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                  Performance par tronc
                </CardTitle>
                <CardDescription>
                  Taux de complétion sur les troncs Golang, JavaScript, Rust et Java
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TrackComparisonChart promoKey={selectedPromo} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Distribution des statuts
                </CardTitle>
                <CardDescription>
                  Répartition des étudiants par niveau de progression
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DelayDistributionChart promoKey={selectedPromo} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Par promotion : Pie + Bar par promo en row ─────────────────── */}
        <TabsContent value="per-promo" className="space-y-4 mt-6">
          {filteredPromos.length === 0 ? (
            <Card>
              <CardContent className="py-6">
                <EmptyState
                  icon={GraduationCap}
                  title="Aucune promotion à afficher"
                  description="Sélectionnez une promotion ou activez-en une dans Gestion Promos."
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {filteredPromos.map((promo) => (
                <div key={promo.key} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold">{promo.title}</h3>
                    <span className="text-xs text-muted-foreground">({promo.key})</span>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {/* Both old charts already wrap themselves in <Card> — do NOT double-wrap. */}
                    <PieChart
                      title={`Statuts · ${promo.title}`}
                      eventID={promo.eventId}
                      keyPromo={promo.key}
                    />
                    <BarChartStacked
                      title={`Progression · ${promo.title}`}
                      eventID={promo.eventId}
                      keyPromo={promo.key}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Comparaisons : track-chart par promo en grille ─────────────── */}
        <TabsContent value="comparison" className="space-y-4 mt-6">
          {filteredPromos.length === 0 ? (
            <Card>
              <CardContent className="py-6">
                <EmptyState icon={GraduationCap} title="Aucune promotion à comparer" />
              </CardContent>
            </Card>
          ) : filteredPromos.length === 1 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{filteredPromos[0].title}</CardTitle>
                <CardDescription>
                  Sélectionnez « Toutes les promotions » pour comparer plusieurs promos côte à côte.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TrackComparisonChart promoKey={filteredPromos[0].key} />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredPromos.map((promo) => (
                <Card key={promo.key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">{promo.title}</CardTitle>
                    <CardDescription className="text-xs">Performance par tronc</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TrackComparisonChart promoKey={promo.key} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
