'use client';

import { useEffect, useState } from 'react';
import { Users, GraduationCap } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { LoadingCard } from '@/components/ui/loading-card';

type OverviewData = {
  totalStudents: number;
  totalPromos: number;
  goodProgress: number;
  lateStudents: number;
  validated: number;
  successRate: number;
};

export default function OverviewWidget() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        const response = await fetch('/api/widgets/overview');
        if (!response.ok) return;
        const result = await response.json();
        if (active && result?.success) setData(result.data);
      } catch (err) {
        console.error('overview-widget fetch failed', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) return <LoadingCard height="sm" count={2} columns={2} />;
  if (!data) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <StatCard
        label="Étudiants actifs"
        value={data.totalStudents}
        hint="Promotions actives uniquement"
        icon={Users}
      />
      <StatCard
        label="Promotions actives"
        value={data.totalPromos}
        hint="En cours actuellement"
        icon={GraduationCap}
      />
    </div>
  );
}
