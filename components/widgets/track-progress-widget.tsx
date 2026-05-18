'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Code2, Zap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { trackAccent } from '@/lib/track-colors';

type TrackData = {
  track: string;
  completed: number;
  total: number;
  percentage: number;
};

const trackTitle = (track: string) =>
  track.charAt(0).toUpperCase() + track.slice(1).toLowerCase();

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
      <Card>
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code2 className="h-5 w-5" />
          Progression par Tronc
        </CardTitle>
        <CardDescription>Taux de complétion des différents parcours</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tracks.map((track) => {
            const color = trackAccent(trackTitle(track.track));
            return (
            <div key={track.track} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" style={{ color }} />
                  <span className="font-medium" style={{ color }}>
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
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
