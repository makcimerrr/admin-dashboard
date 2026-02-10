'use client';

import React, { useState } from 'react';
import PieChart from '@/components/pie-chart-student';
import BarChartStacked from '@/components/bar-chart-student-stacked';
import TrackComparisonChart from '@/components/charts/track-comparison-chart';
import DelayDistributionChart from '@/components/charts/delay-distribution-chart';
import promos from 'config/promoConfig.json' assert { type: 'json' };
import { BarChart3, TrendingUp, Users, Calendar, Activity, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AnalyticsPage() {
  const [selectedPromo, setSelectedPromo] = useState<string>('all');

  const filteredPromos = selectedPromo === 'all'
    ? promos
    : promos.filter(promo => promo.key === selectedPromo);

  return (
    <div className="page-container flex flex-col gap-4 md:gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-3 bg-primary/10 rounded-lg">
            <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">
              Suivez les métriques clés et les statistiques pour chaque promotion
            </p>
          </div>
        </div>

        {/* Filter */}
        <Select value={selectedPromo} onValueChange={setSelectedPromo}>
          <SelectTrigger className="w-full sm:w-[200px]">
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
      </div>

      {/* Stats Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Promotions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredPromos.length}</div>
            <p className="text-xs text-muted-foreground">
              {selectedPromo === 'all' ? 'Toutes les promotions actives' : 'Promotion sélectionnée'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Métriques Actives</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredPromos.length * 2}</div>
            <p className="text-xs text-muted-foreground">
              Graphiques et statistiques
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suivi en Temps Réel</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Actif</div>
            <p className="text-xs text-muted-foreground">
              Données mises à jour
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="distribution">Répartition</TabsTrigger>
          <TabsTrigger value="progression">Progression</TabsTrigger>
          <TabsTrigger value="comparison">Comparaisons</TabsTrigger>
        </TabsList>

        {/* Overview Tab - New comprehensive view */}
        <TabsContent value="overview" className="space-y-4 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Track Comparison */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-cyan-600" />
                  Comparaison des Troncs
                </CardTitle>
                <CardDescription>
                  Taux de complétion par tronc de formation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TrackComparisonChart promoKey={selectedPromo} />
              </CardContent>
            </Card>

            {/* Delay Distribution */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-600" />
                  Distribution des Statuts
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

        <TabsContent value="distribution" className="space-y-4 mt-6">
          <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {filteredPromos.map((promo) => (
              <Card key={promo.key} className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg">{promo.title}</CardTitle>
                  <CardDescription>Répartition des étudiants</CardDescription>
                </CardHeader>
                <CardContent>
                  <PieChart
                    title={promo.title}
                    eventID={promo.eventId}
                    keyPromo={promo.key}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="progression" className="space-y-4 mt-6">
          <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
            {filteredPromos.map((promo) => (
              <Card key={promo.key} className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg">{promo.title}</CardTitle>
                  <CardDescription>Progression détaillée des étudiants</CardDescription>
                </CardHeader>
                <CardContent>
                  <BarChartStacked
                    title={promo.title}
                    eventID={promo.eventId}
                    keyPromo={promo.key}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Comparison Tab - Detailed comparisons */}
        <TabsContent value="comparison" className="space-y-6 mt-6">
          {/* Global Comparison */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-2 bg-gradient-to-br from-cyan-50/50 to-blue-50/50 dark:from-cyan-950/20 dark:to-blue-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-cyan-600" />
                  Performance des Troncs
                </CardTitle>
                <CardDescription>
                  Comparaison globale des taux de complétion
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TrackComparisonChart promoKey={selectedPromo} />
              </CardContent>
            </Card>

            <Card className="border-2 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-600" />
                  État de Progression
                </CardTitle>
                <CardDescription>
                  Vue d'ensemble des statuts de progression
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DelayDistributionChart promoKey={selectedPromo} />
              </CardContent>
            </Card>
          </div>

          {/* Per-Promo Comparison */}
          {selectedPromo === 'all' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Comparaison par Promotion</h3>
              <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
                {filteredPromos.map((promo) => (
                  <Card key={promo.key} className="border-2">
                    <CardHeader>
                      <CardTitle className="text-lg">{promo.title}</CardTitle>
                      <CardDescription>Performance par tronc</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <TrackComparisonChart promoKey={promo.key} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}