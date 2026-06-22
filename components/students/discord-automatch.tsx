'use client';

import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Sparkles, Loader2, AlertTriangle, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Confidence = 'high' | 'medium' | 'low';

interface Suggestion {
  login: string;
  name: string;
  promoName: string | null;
  discordId: string;
  memberLabel: string;
  matchedOn: string;
  confidence: Confidence;
  preChecked: boolean;
}

const CONF_BADGE: Record<Confidence, string> = {
  high: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  medium: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  low: 'bg-zinc-500/15 text-zinc-500 dark:text-zinc-400 border-zinc-500/30',
};
const CONF_LABEL: Record<Confidence, string> = { high: 'Sûr', medium: 'Probable', low: 'Incertain' };

export function DiscordAutoMatch({ promo, onApplied }: { promo: string; onApplied: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [meta, setMeta] = useState<{ memberCount: number; unlinkedCount: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuggestions([]);
    try {
      const res = await fetch(`/api/discord/match?promo=${encodeURIComponent(promo)}`);
      const json = await res.json();
      if (!res.ok || !json?.success) {
        const msg = json?.error?.message ?? 'Erreur lors de la récupération des suggestions.';
        const guilds = json?.error?.details?.guilds as { id: string; name: string }[] | undefined;
        setError(guilds?.length ? `${msg}\nServeurs : ${guilds.map((g) => `${g.name} (${g.id})`).join(', ')}` : msg);
        return;
      }
      const list: Suggestion[] = json.data.suggestions ?? [];
      setSuggestions(list);
      setSelected(new Set(list.filter((s) => s.preChecked).map((s) => s.login)));
      setMeta({ memberCount: json.data.memberCount ?? 0, unlinkedCount: json.data.unlinkedCount ?? 0 });
    } catch {
      setError('Impossible de contacter le serveur Discord.');
    } finally {
      setLoading(false);
    }
  }, [promo]);

  const openDialog = () => { setOpen(true); void load(); };

  const toggle = (login: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(login)) next.delete(login); else next.add(login);
      return next;
    });
  };

  const apply = async () => {
    const chosen = suggestions.filter((s) => selected.has(s.login));
    if (chosen.length === 0) return;
    // Garde-fou : un même Discord ne peut pas être lié à deux apprenants.
    const seen = new Map<string, string>();
    for (const c of chosen) {
      if (seen.has(c.discordId)) {
        toast.error(`Conflit : ${c.memberLabel} sélectionné pour ${seen.get(c.discordId)} et ${c.name}. Décochez l'un des deux.`);
        return;
      }
      seen.set(c.discordId, c.name);
    }

    setApplying(true);
    const results = await Promise.allSettled(
      chosen.map((c) =>
        fetch('/api/discord/manage', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ op: 'setDiscordId', login: c.login, discordId: c.discordId }),
        }).then(async (r) => {
          if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error ?? `HTTP ${r.status}`);
          return true;
        }),
      ),
    );
    setApplying(false);

    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const ko = results.length - ok;
    if (ok > 0) toast.success(`${ok} liaison${ok > 1 ? 's' : ''} créée${ok > 1 ? 's' : ''}.`);
    if (ko > 0) toast.error(`${ko} échec${ko > 1 ? 's' : ''}.`);
    if (ok > 0) { onApplied(); setOpen(false); }
  };

  return (
    <>
      <Button type="button" variant="outline" onClick={openDialog} className="gap-2">
        <Sparkles className="h-4 w-4" />
        Suggérer depuis Discord
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Suggestions de liaison Discord</DialogTitle>
            <DialogDescription>
              Rapprochement des pseudos du serveur avec les apprenants non liés
              {promo !== 'all' ? ' de la promo sélectionnée' : ''}. Vérifiez puis liez la sélection.
            </DialogDescription>
          </DialogHeader>

          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Analyse des membres du serveur…
            </div>
          )}

          {!loading && error && (
            <div className="flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
              <span className="whitespace-pre-line">{error}</span>
            </div>
          )}

          {!loading && !error && suggestions.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Aucune correspondance trouvée parmi les membres du serveur.
              {meta && <div className="mt-1 text-xs">{meta.memberCount} membres · {meta.unlinkedCount} apprenants non liés</div>}
            </div>
          )}

          {!loading && !error && suggestions.length > 0 && (
            <>
              <div className="max-h-[55vh] overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[40px]" />
                      <TableHead>Apprenant</TableHead>
                      <TableHead>Pseudo Discord</TableHead>
                      <TableHead className="w-[150px]">Correspondance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suggestions.map((s) => (
                      <TableRow
                        key={s.login}
                        className="cursor-pointer"
                        onClick={() => toggle(s.login)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selected.has(s.login)}
                            onCheckedChange={() => toggle(s.login)}
                            aria-label={`Lier ${s.name}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium leading-tight">{s.name}</div>
                          <div className="text-xs text-muted-foreground">{s.login}{s.promoName ? ` · ${s.promoName}` : ''}</div>
                        </TableCell>
                        <TableCell className="text-sm">{s.memberLabel}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('font-normal', CONF_BADGE[s.confidence])}>
                            {CONF_LABEL[s.confidence]}
                          </Badge>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">{s.matchedOn}</div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="text-xs text-muted-foreground">
                {selected.size} sélectionné{selected.size > 1 ? 's' : ''} sur {suggestions.length} suggestion{suggestions.length > 1 ? 's' : ''}
                {meta ? ` · ${meta.memberCount} membres scannés` : ''}
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={applying}>Annuler</Button>
            <Button onClick={apply} disabled={applying || selected.size === 0} className="gap-2">
              {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Lier la sélection ({selected.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
