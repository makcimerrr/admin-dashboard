'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { StudentsSubnav } from '../_components/students-subnav';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingCard } from '@/components/ui/loading-card';
import { affinityPill, affinityText } from '@/lib/skills-display';
import { cn } from '@/lib/utils';
import { Sparkles, Search, ArrowRight, Flame } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface GiteaProfile {
  totalContributions: number;
  contributions30d: number;
  currentStreakDays: number;
  lastActivityAt: string | null;
  engagementScore: number;
  affinityLabel: string;
}

interface Row {
  id: number;
  login: string;
  firstName: string;
  lastName: string;
  promoName: string | null;
  profile: GiteaProfile | null;
}

interface Promo {
  key: string;
  title: string;
  eventId: number;
}

export default function SkillsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPromo, setSelectedPromo] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/promotions/active')
      .then((r) => r.json())
      .then((d) => d.success && setPromos(d.promotions))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/students/skills?promo=${encodeURIComponent(selectedPromo)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setRows(d.students);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedPromo]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? rows.filter((r) => `${r.firstName} ${r.lastName} ${r.login}`.toLowerCase().includes(q))
      : rows;
    // Tri par engagement décroissant, profils sans data en bas.
    return [...list].sort(
      (a, b) => (b.profile?.engagementScore ?? -1) - (a.profile?.engagementScore ?? -1),
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    const total = rows.length;
    const scanned = rows.filter((r) => r.profile).length;
    const active = rows.filter((r) => (r.profile?.contributions30d ?? 0) > 0).length;
    const avg =
      scanned > 0
        ? Math.round(
            rows.reduce((acc, r) => acc + (r.profile?.engagementScore ?? 0), 0) / scanned,
          )
        : 0;
    return { total, scanned, active, avg };
  }, [rows]);

  return (
    <div className="page-container flex flex-col gap-4 md:gap-6 p-4 md:p-6">
      <PageHeader
        icon={Sparkles}
        title="Compétences & appétence"
        description="Engagement Gitea et langages par étudiant. Clique sur un étudiant pour le détail."
      />

      <StudentsSubnav />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={selectedPromo} onValueChange={setSelectedPromo}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Promotion" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les promotions</SelectItem>
            {promos.map((p) => (
              <SelectItem key={p.key} value={p.key}>
                {p.title || p.key}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher nom ou login..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Étudiants" value={stats.total} loading={loading} />
        <Stat label="Profils scannés" value={`${stats.scanned}/${stats.total}`} loading={loading} />
        <Stat label="Actifs (30j)" value={stats.active} loading={loading} />
        <Stat label="Engagement moyen" value={stats.avg} loading={loading} />
      </div>

      {loading ? (
        <LoadingCard height="lg" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Sparkles} title="Aucun étudiant" />
      ) : (
        <Card>
          <CardContent className="p-0">
            {/* Desktop */}
            <Table className="hidden md:table">
              <TableHeader>
                <TableRow>
                  <TableHead>Étudiant</TableHead>
                  <TableHead>Promo</TableHead>
                  <TableHead>Engagement</TableHead>
                  <TableHead>Appétence</TableHead>
                  <TableHead>Activité 30j</TableHead>
                  <TableHead>Série</TableHead>
                  <TableHead>Dernière activité</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.firstName} {r.lastName}</div>
                      <div className="font-mono text-xs text-muted-foreground">{r.login}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">{r.promoName ?? '—'}</Badge>
                    </TableCell>
                    <TableCell>
                      {r.profile ? <EngagementBar score={r.profile.engagementScore} /> : <span className="text-xs text-muted-foreground italic">non scanné</span>}
                    </TableCell>
                    <TableCell>
                      {r.profile && (
                        <Badge variant="outline" className={affinityPill(r.profile.affinityLabel)}>
                          {affinityText(r.profile.affinityLabel)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums text-sm">{r.profile?.contributions30d ?? '—'}</TableCell>
                    <TableCell>
                      {r.profile && r.profile.currentStreakDays > 0 ? (
                        <span className="inline-flex items-center gap-1 text-sm">
                          <Flame className="h-3.5 w-3.5 text-warning" />
                          {r.profile.currentStreakDays}j
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.profile?.lastActivityAt
                        ? formatDistanceToNow(new Date(r.profile.lastActivityAt), { locale: fr, addSuffix: true })
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Link href={`/students/${r.id}`} className="text-muted-foreground hover:text-primary">
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Mobile */}
            <ul className="md:hidden divide-y">
              {filtered.map((r) => (
                <li key={r.id}>
                  <Link href={`/students/${r.id}`} className="flex items-start justify-between gap-2 p-3 active:bg-muted/50">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{r.firstName} {r.lastName}</div>
                      <div className="font-mono text-xs text-muted-foreground truncate">{r.login}</div>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-normal text-[10px]">{r.promoName ?? '—'}</Badge>
                        {r.profile ? (
                          <Badge variant="outline" className={cn('text-[10px]', affinityPill(r.profile.affinityLabel))}>
                            {affinityText(r.profile.affinityLabel)}
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">non scanné</span>
                        )}
                        {r.profile && r.profile.currentStreakDays > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <Flame className="h-3 w-3 text-warning" />
                            {r.profile.currentStreakDays}j
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold tabular-nums">{r.profile?.engagementScore ?? '—'}</div>
                      <div className="text-[10px] text-muted-foreground">/100</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, loading }: { label: string; value: React.ReactNode; loading?: boolean }) {
  return (
    <Card className="p-3">
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      {loading ? (
        <div className="h-7 w-16 mt-1 bg-muted rounded animate-pulse" />
      ) : (
        <p className="text-xl md:text-2xl font-bold mt-1 tabular-nums">{value}</p>
      )}
    </Card>
  );
}

function EngagementBar({ score }: { score: number }) {
  const tone = score >= 75 ? 'bg-success' : score >= 50 ? 'bg-primary' : score >= 25 ? 'bg-warning' : 'bg-warning';
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', tone)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground w-7">{score}</span>
    </div>
  );
}
