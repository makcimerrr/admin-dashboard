import { getTrackStatsByPromo } from '@/lib/db/services/track-stats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Clock } from 'lucide-react';
import { getAllPromotions } from '@/lib/config/promotions';
import { trackAccent } from '@/lib/track-colors';

interface TrackStatsDisplayProps {
  selectedPromo: string | null;
}

export default async function TrackStatsDisplay({ selectedPromo }: TrackStatsDisplayProps) {
  const stats = await getTrackStatsByPromo(selectedPromo === 'all' ? null : selectedPromo);
  const promos = await getAllPromotions();

  // Visible tracks depend on whether the JS / Rust-Java piscines have started
  const getVisibleTracks = () => {
    if (selectedPromo === 'all') return ['Golang', 'Javascript', 'Rust', 'Java'];
    const promo = promos.find((p) => p.key === selectedPromo);
    if (!promo) return ['Golang', 'Javascript', 'Rust', 'Java'];

    const today = new Date();
    const piscineJsStart = new Date(promo.dates['piscine-js-start']);
    const piscineRustJavaStart = new Date(promo.dates['piscine-rust-java-start']);

    const visible = ['Golang'];
    if (!isNaN(piscineJsStart.getTime()) && today >= piscineJsStart) {
      visible.push('Javascript');
    }
    if (!isNaN(piscineRustJavaStart.getTime()) && today >= piscineRustJavaStart) {
      visible.push('Rust', 'Java');
    }
    return visible;
  };

  const visibleTracks = getVisibleTracks();
  const filteredStats = stats.filter((stat) => visibleTracks.includes(stat.track));
  if (filteredStats.length === 0) return null;

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      {filteredStats.map((stat) => {
        const accent = trackAccent(stat.track);
        return (
          <Card key={stat.track} className="border">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">{stat.track}</CardTitle>
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: accent }}
                  aria-hidden
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {stat.total} étudiant{stat.total > 1 ? 's' : ''}
              </p>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" style={{ color: accent }} />
                  <span className="font-medium tabular-nums">{stat.completed}</span>
                  <span className="text-muted-foreground">terminé{stat.completed > 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium tabular-nums">{stat.inProgress}</span>
                  <span className="text-muted-foreground">en cours</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Progression</span>
                  <span className="font-bold tabular-nums" style={{ color: accent }}>
                    {stat.completionRate}%
                  </span>
                </div>
                <Progress value={stat.completionRate} className="h-1.5" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
