'use client';

import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Loader2 } from 'lucide-react';

type DelayData = {
  level: string;
  count: number;
};

const DELAY_CHART_VARS: Record<string, string> = {
  'bien': '--chart-5',
  'en retard': '--chart-6',
  'Validé': '--chart-1',
  'Non Validé': '--chart-2',
};

function useDelayColors() {
  const [colors, setColors] = useState<Record<string, string>>({
    'bien': '#22c55e',
    'en retard': '#ef4444',
    'Validé': '#3b82f6',
    'Non Validé': '#f43f5e',
  });
  useEffect(() => {
    function read() {
      const style = getComputedStyle(document.documentElement);
      const c: Record<string, string> = {};
      for (const [level, cssVar] of Object.entries(DELAY_CHART_VARS)) {
        c[level] = style.getPropertyValue(cssVar).trim() || '#8884d8';
      }
      setColors(c);
    }
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return colors;
}

const LABELS = {
  'bien': 'En bonne progression',
  'en retard': 'En retard',
  'Validé': 'Validé',
  'Non Validé': 'Non validé',
};

export default function DelayDistributionChart({ promoKey }: { promoKey: string }) {
  const [data, setData] = useState<DelayData[]>([]);
  const [loading, setLoading] = useState(true);
  const delayColors = useDelayColors();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/analytics/delay-distribution?promo=${promoKey}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // Filter out levels with 0 count for better visualization
            const filtered = result.delayLevels.filter((item: DelayData) => item.count > 0);
            setData(filtered);
          }
        }
      } catch (error) {
        console.error('Error fetching delay distribution data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [promoKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        Aucune donnée disponible
      </div>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    name: LABELS[item.level as keyof typeof LABELS] || item.level,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={100}
          fill="#8884d8"
          dataKey="count"
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={delayColors[data[index].level] || '#8884d8'}
            />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="grid gap-2">
                    <div className="flex flex-col">
                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                        {data.name}
                      </span>
                      <span className="font-bold">{data.count} étudiants</span>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
