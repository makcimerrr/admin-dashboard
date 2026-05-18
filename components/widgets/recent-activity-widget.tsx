'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import Link from 'next/link';
import { PILL } from '@/lib/status-pills';

type Activity = {
  id: number;
  studentName: string;
  promo: string;
  project: string | null;
  status: string | null;
  delayLevel: string | null;
};

const getDelayLevelColor = (level: string | null) => {
  switch (level) {
    case 'bien':
      return PILL.emerald;
    case 'en retard':
      return PILL.red;
    case 'Validé':
      return PILL.blue;
    case 'Non Validé':
      return PILL.rose;
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

export default function RecentActivityWidget() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/widgets/recent-activity');
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setActivities(result.activities);
          }
        }
      } catch (error) {
        console.error('Error fetching recent activity:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40 mb-2" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Activité Récente
        </CardTitle>
        <CardDescription>Dernières mises à jour des étudiants</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <EmptyState icon={Clock} title="Aucune activité récente" size="compact" />
          ) : (
            activities.map((activity) => (
              <Link
                key={activity.id}
                href={`/student?id=${activity.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{activity.studentName}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{activity.promo}</span>
                    {activity.project && (
                      <>
                        <span>•</span>
                        <span className="truncate">{activity.project}</span>
                      </>
                    )}
                  </div>
                </div>
                {activity.delayLevel && (
                  <Badge variant="outline" className={getDelayLevelColor(activity.delayLevel)}>
                    {activity.delayLevel}
                  </Badge>
                )}
              </Link>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
