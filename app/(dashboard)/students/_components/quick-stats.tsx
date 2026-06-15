'use client';

import { StatCard } from '@/components/ui/stat-card';
import { Users, UserCheck, UserX, TrendingUp, Archive } from 'lucide-react';

interface QuickStatsProps {
  totalStudents: number;
  activeStudents: number;
  dropoutStudents: number;
  archivedStudents?: number;
}

export function QuickStats({
  totalStudents,
  activeStudents,
  dropoutStudents,
  archivedStudents = 0,
}: QuickStatsProps) {
  const activePercentage =
    totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <StatCard label="Total" value={totalStudents} icon={Users} />
      <StatCard
        label="Actifs"
        value={activeStudents}
        icon={UserCheck}
        accent="var(--chart-2)"
      />
      <StatCard
        label="Perdition"
        value={dropoutStudents}
        icon={UserX}
        accent="hsl(var(--destructive))"
      />
      <StatCard
        label="Archivés"
        value={archivedStudents}
        icon={Archive}
        accent="var(--chart-4)"
      />
      <StatCard
        label="Taux actif"
        value={`${activePercentage}%`}
        icon={TrendingUp}
        accent="var(--chart-3)"
      />
    </div>
  );
}
