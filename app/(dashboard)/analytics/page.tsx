'use client';

import React, { useState } from 'react';
import PieChart from '@/components/pie-chart-student';
import BarChartStacked from '@/components/bar-chart-student-stacked';
import promos from 'config/promoConfig.json' assert { type: 'json' };
import { BarChart3, TrendingUp, Users, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AnalyticsPage() {
  const [selectedPromo, setSelectedPromo] = useState<string>('all');

  const filteredPromos = selectedPromo === 'all'
    ? promos
    : promos.filter(promo => promo.key === selectedPromo);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-lg">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground">
              Suivez les métriques clés et les statistiques pour chaque promotion
            </p>
          </div>
        </div>

        {/* Filter */}
        <Select value={selectedPromo} onValueChange={setSelectedPromo}>
          <SelectTrigger className="w-[200px]">
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
      <Tabs defaultValue="distribution" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="distribution">Répartition</TabsTrigger>
          <TabsTrigger value="progression">Progression</TabsTrigger>
        </TabsList>

        <TabsContent value="distribution" className="space-y-4 mt-6">
          <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {filteredPromos.map((promo) => (
              <Card key={promo.key}>
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
              <Card key={promo.key}>
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
      </Tabs>
    </div>
  );
}