'use client';

import { Card } from '@/components/ui/card';
import { Users, UserCheck, UserX, TrendingUp } from 'lucide-react';

interface QuickStatsProps {
  totalStudents: number;
  activeStudents: number;
  dropoutStudents: number;
}

export function QuickStats({
  totalStudents,
  activeStudents,
  dropoutStudents
}: QuickStatsProps) {
  const activePercentage = totalStudents > 0
    ? Math.round((activeStudents / totalStudents) * 100)
    : 0;

  const stats = [
    {
      label: 'Total',
      value: totalStudents,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      label: 'Actifs',
      value: activeStudents,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      label: 'Perdition',
      value: dropoutStudents,
      icon: UserX,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      label: 'Taux actif',
      value: `${activePercentage}%`,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {stat.label}
            </span>
            <div className={`p-1.5 rounded ${stat.bgColor}`}>
              <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
            </div>
          </div>
          <p className={`text-2xl font-bold mt-1 ${stat.color}`}>
            {stat.value}
          </p>
        </Card>
      ))}
    </div>
  );
}
