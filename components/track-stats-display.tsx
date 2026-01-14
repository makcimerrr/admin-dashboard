import { getTrackStatsByPromo } from '@/lib/db/services/track-stats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Clock } from 'lucide-react';
import promos from 'config/promoConfig.json' assert { type: 'json' };

interface TrackStatsDisplayProps {
  selectedPromo: string | null;
}

export default async function TrackStatsDisplay({ selectedPromo }: TrackStatsDisplayProps) {
  const stats = await getTrackStatsByPromo(selectedPromo === 'all' ? null : selectedPromo);

  // Déterminer quels troncs afficher selon la promo
  const getVisibleTracks = () => {
    if (selectedPromo === 'all') {
      return ['Golang', 'Javascript', 'Rust', 'Java'];
    }

    const promo = promos.find(p => p.key === selectedPromo);
    if (!promo) {
      return ['Golang', 'Javascript', 'Rust', 'Java'];
    }

    const today = new Date();
    const piscineJsStart = new Date(promo.dates['piscine-js-start']);
    const piscineRustJavaStart = new Date(promo.dates['piscine-rust-java-start']);

    const visibleTracks = ['Golang']; // Toujours afficher Golang

    if (!isNaN(piscineJsStart.getTime()) && today >= piscineJsStart) {
      visibleTracks.push('Javascript');
    }

    if (!isNaN(piscineRustJavaStart.getTime()) && today >= piscineRustJavaStart) {
      visibleTracks.push('Rust', 'Java');
    }

    return visibleTracks;
  };

  const visibleTracks = getVisibleTracks();
  const filteredStats = stats.filter(stat => visibleTracks.includes(stat.track));

  const getTrackColor = (track: string) => {
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

  if (filteredStats.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      {filteredStats.map((stat) => (
        <Card key={stat.track} className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">{stat.track}</CardTitle>
              <div className={`h-2 w-2 rounded-full ${getTrackColor(stat.track)}`} />
            </div>
            <CardDescription className="text-xs">
              {stat.total} étudiants au total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="font-medium">{stat.completed}</span>
                  <span className="text-muted-foreground">terminés</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="font-medium">{stat.inProgress}</span>
                  <span className="text-muted-foreground">en cours</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progression</span>
                  <span className="font-bold">{stat.completionRate}%</span>
                </div>
                <Progress value={stat.completionRate} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
