'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Loader2 } from 'lucide-react';

type TrackData = {
  track: string;
  completed: number;
  total: number;
  percentage: number;
};

const COLORS = {
  Golang: '#00ADD8',
  Javascript: '#F7DF1E',
  Rust: '#CE422B',
  Java: '#007396',
};

export default function TrackComparisonChart({ promoKey }: { promoKey: string }) {
  const [data, setData] = useState<TrackData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/analytics/track-comparison?promo=${promoKey}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setData(result.tracks);
          }
        }
      } catch (error) {
        console.error('Error fetching track comparison data:', error);
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

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="track" />
        <YAxis />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="grid gap-2">
                    <div className="flex flex-col">
                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                        {data.track}
                      </span>
                      <span className="font-bold">
                        {data.completed}/{data.total} ({data.percentage}%)
                      </span>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend />
        <Bar dataKey="percentage" name="Taux de complétion (%)" radius={[8, 8, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[entry.track as keyof typeof COLORS] || '#8884d8'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
