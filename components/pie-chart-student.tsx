'use client';

import * as React from 'react';
import { Label, Pie, PieChart, Sector } from 'recharts';
import { PieSectorDataItem } from 'recharts/types/polar/Pie';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { use, useEffect } from 'react';

interface DelayData {
  level: string;
  count: number;
  fill: string;
}

interface PieChartProps {
  title?: string;
  keyPromo?: string;
  eventID?: number;
}

export function Component({ title, eventID, keyPromo }: PieChartProps) {
  const id = 'pie-interactive';
  const [activeLevel, setActiveLevel] = React.useState<string | null>(null);
  const [delayLevelData, setDelayLevelData] = React.useState<DelayData[]>([]);
  const [chartConfig, setChartConfig] = React.useState<ChartConfig | null>(
    null
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/delay-status?promoId=${eventID}`);
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des données');
      }
      const { lateCount, goodLateCount, advanceLateCount, specialityCount } =
        await response.json();

      if (
        lateCount === undefined ||
        goodLateCount === undefined ||
        advanceLateCount === undefined ||
        specialityCount === undefined
      ) {
        throw new Error('Les données sont incomplètes ou absentes.');
      }

      const data: DelayData[] = [
        { level: 'bien', count: goodLateCount, fill: 'var(--color-bien)' },
        { level: 'retard', count: lateCount, fill: 'var(--color-retard)' },
        {
          level: 'avance',
          count: advanceLateCount,
          fill: 'var(--color-avance)'
        },
        {
          level: 'spécialité',
          count: specialityCount,
          fill: 'var(--color-spécialité)'
        }
      ];

      setDelayLevelData(data);

      const highestLevel = data.reduce((prev, current) => {
        return prev.count > current.count ? prev : current;
      }, data[0]);

      setActiveLevel(highestLevel.level);

      const chartConfig = {
        bien: {
          label: 'Bien',
          color: 'hsl(var(--chart-1))'
        },
        retard: {
          label: 'En Retard',
          color: 'hsl(var(--chart-2))'
        },
        avance: {
          label: 'En Avance',
          color: 'hsl(var(--chart-3))'
        },
        spécialité: {
          label: 'Spécialité',
          color: 'hsl(var(--chart-4))'
        }
      } satisfies ChartConfig;

      setChartConfig(chartConfig);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Une erreur est survenue'
      );
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    }
  }

  useEffect(() => {
    fetchData().then(r => r);
  }, []);

  const activeIndex = React.useMemo(
    () => delayLevelData.findIndex((item) => item.level === activeLevel),
    [activeLevel, delayLevelData]
  );
  const levels = React.useMemo(
    () => delayLevelData.map((item) => item.level),
    [delayLevelData]
  );

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

  if (delayLevelData.length === 0) {
    return (
      <Card className="flex items-center justify-center h-64">
        <p className="text-lg font-medium text-muted-foreground">
          Aucune donnée disponible pour la promotion spécifiée.
        </p>
      </Card>
    );
  }

  return (
    <Card data-chart={id} className="flex flex-col">
      <ChartStyle id={id} config={chartConfig ?? {}} />
      <CardHeader className="flex-row items-start space-y-0 pb-0">
        <div className="grid gap-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>Delay Levels of {keyPromo}</CardDescription>
        </div>
        <Select value={activeLevel || ''} onValueChange={setActiveLevel}>
          <SelectTrigger
            className="ml-auto h-7 w-[130px] rounded-lg pl-2.5"
            aria-label="Select a value"
          >
            <SelectValue placeholder="Select level" />
          </SelectTrigger>
          <SelectContent align="end" className="rounded-xl">
            {levels.map((key) => {
              if (!chartConfig) {
                return null;
              }

              const config = chartConfig[key as keyof typeof chartConfig];

              if (!config) {
                return null;
              }

              return (
                <SelectItem
                  key={key}
                  value={key}
                  className="rounded-lg [&_span]:flex"
                >
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className="flex h-3 w-3 shrink-0 rounded-sm"
                      style={{
                        backgroundColor: `var(--color-${key})`
                      }}
                    />
                    {config?.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="flex flex-1 justify-center pb-0">
        <ChartContainer
          id={id}
          config={chartConfig ?? {}}
          className="mx-auto aspect-square w-full max-w-[300px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={delayLevelData}
              dataKey="count"
              nameKey="level"
              innerRadius={60}
              strokeWidth={5}
              activeIndex={activeIndex}
              activeShape={({
                outerRadius = 0,
                ...props
              }: PieSectorDataItem) => (
                <g>
                  <Sector {...props} outerRadius={outerRadius + 10} />
                  <Sector
                    {...props}
                    outerRadius={outerRadius + 25}
                    innerRadius={outerRadius + 12}
                  />
                </g>
              )}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {delayLevelData[activeIndex]?.count?.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Students
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export default Component;
