'use client';

import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import * as React from 'react';

// Fonction pour transformer la date en mois (par exemple "2025-01-01" devient "January")
function formatMonth(date: string): string {
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];

  const dateObj = new Date(date);
  const monthIndex = dateObj.getMonth(); // Récupère l'index du mois (0-11)
  return monthNames[monthIndex];
}

// Fonction pour arrondir et formater les nombres
function formatNumber(value: number): number {
  return Math.round(value); // Enlève les décimales et arrondit au nombre entier
}

// Configuration des niveaux
const chartConfig = {
  bien: {
    label: 'Bien',
    color: 'hsl(var(--chart-1))'
  },
  en_retard: {
    label: 'En Retard',
    color: 'hsl(var(--chart-2))'
  }
} satisfies ChartConfig;

interface BarChartProps {
  title?: string;
  keyPromo?: string;
  eventID?: number;
}

export default function Component({ title, eventID, keyPromo }: BarChartProps) {
  const [chartData, setChartData] = useState<any[]>([]); // État pour les données du graphique
  const [loading, setLoading] = useState(true); // État pour le chargement
  const [error, setError] = useState<string | null>(null); // État pour les erreurs

  async function fetchData() {
    setLoading(true);
    setError(null);

    try {
      // Remplacer par l'URL correcte de votre API
      const res = await fetch(
        `/api/delay-status?action=summary&promoId=${eventID}`
      );
      if (!res.ok) {
        throw new Error('Erreur lors de la récupération des données');
      }

      const data = await res.json();

      // Formater les mois dans les données récupérées
      const formattedData = data.map((item: any) => ({
        ...item,
        month: formatMonth(item.month),
        bien: formatNumber(item.avgGoodLateCount),
        en_retard: formatNumber(item.avgLateCount)
      }));

      console.log(formattedData);

      setChartData(formattedData);
    } catch (err: any) {
      setError(err.message || 'Erreur inconnue');
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    }
  }

  useEffect(() => {
    fetchData().then((r) => r);
  }, []);

  if (loading) {
    return (
      <Card className="flex items-center justify-center h-64">
        <p className="text-lg font-medium text-muted-foreground animate-pulse">
          Chargement des données...
        </p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="flex items-center justify-center h-64">
        <p className="text-lg font-medium text-red-500">
          Erreur : {error}. Veuillez réessayer.
        </p>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="flex items-center justify-center h-64">
        <p className="text-lg font-medium text-muted-foreground">
          Aucune donnée disponible pour la promotion spécifiée.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || 'Delay Levels - Stacked Bar Chart'}</CardTitle>
        <CardDescription>Derniers mois disponibles</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)} // Troncature du mois
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="bien"
              stackId="a"
              fill="var(--color-bien)"
              radius={[0, 0, 4, 4]} // Coins arrondis
            />
            <Bar
              dataKey="en_retard"
              stackId="a"
              fill="var(--color-en_retard)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          {chartData.length > 1 ? (
            (() => {
              const currentMonthValue = chartData[chartData.length - 1].en_retard; // Dernier mois
              const otherMonthsValues = chartData
                .slice(0, chartData.length - 1) // Exclure le dernier mois
                .map((item) => item.en_retard);

              // Moyenne des autres mois
              const otherMonthsAverage =
                otherMonthsValues.reduce((acc, val) => acc + val, 0) /
                otherMonthsValues.length;

              // Calculer l'augmentation en %
              const increasePercentage =
                otherMonthsAverage > 0
                  ? ((currentMonthValue - otherMonthsAverage) /
                    otherMonthsAverage) *
                  100
                  : 0;

              return `Trending ${
                increasePercentage > 0 ? "up" : "down"
              } by ${increasePercentage.toFixed(1)}% this month`;
            })()
          ) : (
            "Pas de données pour analyser les tendances"
          )}
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Showing delay levels for the selected promo
        </div>
      </CardFooter>
    </Card>
  );
}
