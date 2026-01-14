'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Code2, Zap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type TrackData = {
  track: string;
  completed: number;
  total: number;
  percentage: number;
};

const getTrackColor = (track: string) => {
  switch (track.toLowerCase()) {
    case 'golang':
      return 'text-cyan-600';
    case 'javascript':
      return 'text-yellow-600';
    case 'rust':
      return 'text-orange-600';
    case 'java':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};

const getProgressColor = (track: string) => {
  switch (track.toLowerCase()) {
    case 'golang':
      return 'bg-cyan-500';
    case 'javascript':
      return 'bg-yellow-500';
    case 'rust':
      return 'bg-orange-500';
    case 'java':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
};

export default function TrackProgressWidget() {
  const [tracks, setTracks] = useState<TrackData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/widgets/track-progress');
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setTracks(result.tracks);
          }
        }
      } catch (error) {
        console.error('Error fetching track progress:', error);
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
      <Card className="border-2">
        <CardHeader>
          <Skeleton className="h-5 w-40 mb-2" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code2 className="h-5 w-5" />
          Progression par Tronc
        </CardTitle>
        <CardDescription>Taux de complétion des différents parcours</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tracks.map((track) => (
            <div key={track.track} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className={`h-4 w-4 ${getTrackColor(track.track)}`} />
                  <span className={`font-medium ${getTrackColor(track.track)}`}>
                    {track.track}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {track.completed}/{track.total}
                  </span>
                  <span className="text-sm font-semibold">{track.percentage}%</span>
                </div>
              </div>
              <Progress
                value={track.percentage}
                className="h-2"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
