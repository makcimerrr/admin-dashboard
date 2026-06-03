'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { affinityPill, affinityText } from '@/lib/skills-display';
import { cn } from '@/lib/utils';
import { Sparkles, Flame, GitCommitHorizontal, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface GiteaProfile {
  totalContributions: number;
  activeDays: number;
  contributions30d: number;
  contributions90d: number;
  currentStreakDays: number;
  longestStreakDays: number;
  lastActivityAt: string | null;
  engagementScore: number;
  affinityLabel: string;
  languages: Record<string, number> | null;
}

interface Skill {
  id: number;
  category: string;
  name: string;
  level: number;
  affinity: number;
}

/**
 * Chantier A — panneau "Compétences & appétence" sur la fiche étudiant.
 * Palier 1 : affiche l'engagement Gitea (activité). Le détail par langage et
 * les skills (table student_skills) s'affichent dès que le Palier 2 les
 * alimente.
 */
export function StudentSkillsPanel({ login }: { login: string }) {
  const [profile, setProfile] = useState<GiteaProfile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/students/skills?login=${encodeURIComponent(login)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d.success) return;
        setProfile(d.profile);
        setSkills(d.skills ?? []);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [login]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          Compétences & appétence
        </CardTitle>
        <CardDescription>Engagement Gitea — synthèse d'activité</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : !profile ? (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Pas encore de profil Gitea — le scan hebdomadaire ne l'a pas encore traité.</span>
          </div>
        ) : (
          <>
            {/* Engagement + appétence */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="text-3xl font-bold tabular-nums">{profile.engagementScore}<span className="text-base text-muted-foreground">/100</span></div>
                <Badge variant="outline" className={affinityPill(profile.affinityLabel)}>
                  {affinityText(profile.affinityLabel)}
                </Badge>
              </div>
              {profile.currentStreakDays > 0 && (
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <Flame className="h-4 w-4 text-orange-500" />
                  {profile.currentStreakDays}j de série
                </span>
              )}
            </div>

            {/* Métriques */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Metric label="Contributions 30j" value={profile.contributions30d} />
              <Metric label="Contributions 90j" value={profile.contributions90d} />
              <Metric label="Jours actifs" value={profile.activeDays} />
              <Metric
                label="Dernière activité"
                value={
                  profile.lastActivityAt
                    ? formatDistanceToNow(new Date(profile.lastActivityAt), { locale: fr, addSuffix: true })
                    : '—'
                }
                small
              />
            </div>

            {/* Langages (Palier 2) */}
            {profile.languages && Object.keys(profile.languages).length > 0 ? (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Langages</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(profile.languages)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 8)
                    .map(([lang]) => (
                      <Badge key={lang} variant="outline" className="font-normal">
                        <GitCommitHorizontal className="h-3 w-3 mr-1" />
                        {lang}
                      </Badge>
                    ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Aucun langage détecté (pas de repo, ou étudiant pas encore scanné).
              </p>
            )}

            {/* Skills détaillées (Palier 2 / IA) */}
            {skills.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Compétences</p>
                {skills
                  .sort((a, b) => b.level - a.level)
                  .map((s) => (
                    <div key={s.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{s.name}</span>
                        <span className="text-muted-foreground tabular-nums">{s.level}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full bg-violet-500')} style={{ width: `${s.level}%` }} />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, small }: { label: string; value: React.ReactNode; small?: boolean }) {
  return (
    <div className="rounded-lg border p-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn('font-bold tabular-nums mt-0.5', small ? 'text-xs' : 'text-lg')}>{value}</p>
    </div>
  );
}
