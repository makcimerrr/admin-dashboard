'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Star, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CR_TAGS } from '@/lib/code-review-tags';
import type { PlacementProfile } from '@/lib/db/services/audits';

type SortKey = 'rating' | 'name' | 'audits';

export function PlacementClient({ profiles }: { profiles: PlacementProfile[] }) {
  const [search, setSearch] = useState('');
  const [promo, setPromo] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>('rating');
  const [hideAlternants, setHideAlternants] = useState(false);

  const promos = useMemo(
    () => [...new Set(profiles.map((p) => p.promo))].sort(),
    [profiles],
  );

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = profiles.filter((p) => {
      if (promo !== 'all' && p.promo !== promo) return false;
      if (hideAlternants && p.isAlternant) return false;
      if (
        q &&
        !`${p.firstName} ${p.lastName} ${p.login}`.toLowerCase().includes(q)
      ) {
        return false;
      }
      // Tous les tags sélectionnés doivent être des points FORTS du profil.
      if (selectedTags.length > 0) {
        const strengths = new Set(p.strengths.map((s) => s.tag));
        if (!selectedTags.every((t) => strengths.has(t))) return false;
      }
      return true;
    });
    return list.sort((a, b) => {
      if (sort === 'rating') return (b.avgRating ?? -1) - (a.avgRating ?? -1) || a.lastName.localeCompare(b.lastName);
      if (sort === 'audits') return b.auditCount - a.auditCount || a.lastName.localeCompare(b.lastName);
      return a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);
    });
  }, [profiles, search, promo, selectedTags, sort, hideAlternants]);

  return (
    <div className="flex flex-col gap-4">
      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un apprenant…"
            className="h-8 pl-8 w-[220px] text-sm"
          />
        </div>
        <Select value={promo} onValueChange={setPromo}>
          <SelectTrigger className="h-8 w-[150px] text-sm">
            <SelectValue placeholder="Promo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les promos</SelectItem>
            {promos.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="h-8 w-[160px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rating">Tri : note moyenne</SelectItem>
            <SelectItem value="audits">Tri : nb d&apos;audits</SelectItem>
            <SelectItem value="name">Tri : nom</SelectItem>
          </SelectContent>
        </Select>
        <button
          type="button"
          onClick={() => setHideAlternants((v) => !v)}
          className={cn(
            'h-8 px-3 rounded-md border text-xs font-medium transition-colors',
            hideAlternants
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:border-muted-foreground/40',
          )}
        >
          Masquer les alternants
        </button>
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} profil{filtered.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Filtre par tag (points forts requis) */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-medium text-muted-foreground mr-1">Je cherche un profil :</span>
        {CR_TAGS.map((tag) => {
          const active = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={cn(
                'px-2 py-0.5 rounded-full border text-[11px] font-medium transition-colors',
                active
                  ? 'bg-success/15 text-success border-success/40'
                  : 'border-border text-muted-foreground hover:border-muted-foreground/50',
              )}
            >
              {tag}
            </button>
          );
        })}
      </div>

      {/* Grille des profils */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Aucun profil ne correspond aux critères.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <Link
              key={p.studentId}
              href={`/students/${p.studentId}`}
              className="rounded-xl border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all flex flex-col gap-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold truncate">
                    {p.firstName} {p.lastName}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {p.login} • {p.promo}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {p.avgRating != null ? (
                    <span className="flex items-center gap-1 text-sm font-semibold tabular-nums">
                      <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                      {p.avgRating}/10
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/60">non noté</span>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {p.auditCount} CR{p.ratedCount > 0 ? ` • ${p.ratedCount} notée${p.ratedCount > 1 ? 's' : ''}` : ''}
                  </span>
                </div>
              </div>

              {p.isAlternant && (
                <Badge variant="outline" className="w-fit text-[10px] gap-1 bg-primary/10 text-primary border-primary/30">
                  <Briefcase className="h-3 w-3" /> Déjà en alternance
                </Badge>
              )}

              {(p.strengths.length > 0 || p.weaknesses.length > 0) ? (
                <div className="flex flex-wrap gap-1">
                  {p.strengths.map(({ tag, count }) => (
                    <span
                      key={`s-${tag}`}
                      className="px-1.5 py-0 rounded-full border text-[10px] font-medium bg-success/15 text-success border-success/40"
                    >
                      + {tag}
                      {count > 1 && <span className="opacity-70"> ×{count}</span>}
                    </span>
                  ))}
                  {p.weaknesses.map(({ tag, count }) => (
                    <span
                      key={`w-${tag}`}
                      className="px-1.5 py-0 rounded-full border text-[10px] font-medium bg-destructive/15 text-destructive border-destructive/40"
                    >
                      − {tag}
                      {count > 1 && <span className="opacity-70"> ×{count}</span>}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-[11px] text-muted-foreground/60">Aucun tag attribué pour l&apos;instant</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
