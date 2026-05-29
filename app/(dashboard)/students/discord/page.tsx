'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { StudentsSubnav } from '../_components/students-subnav';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingCard } from '@/components/ui/loading-card';
import { PILL } from '@/lib/status-pills';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  Search,
  Check,
  X,
  Pencil,
  Loader2,
  AtSign,
  Link2,
  Link2Off,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface StudentRow {
  id: number;
  login: string;
  firstName: string;
  lastName: string;
  promoName: string | null;
  discordId: string | null;
  mappingId: number | null;
}

interface OrphanRow {
  id: number;
  login: string;
  discordId: string;
}

interface Promo {
  key: string;
  title: string;
  eventId: number;
}

type LinkFilter = 'all' | 'linked' | 'unlinked';

/** A login that contains '@' is almost certainly an email mistakenly used as a handle. */
const looksLikeEmail = (login: string) => login.includes('@');

export default function DiscordLinkPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [orphans, setOrphans] = useState<OrphanRow[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedPromo, setSelectedPromo] = useState<string>('all');
  const [linkFilter, setLinkFilter] = useState<LinkFilter>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/promotions/active')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setPromos(d.promotions);
      })
      .catch(() => {});
  }, []);

  const load = async (promo: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/discord/manage?promo=${encodeURIComponent(promo)}`);
      const data = await res.json();
      if (data.success) {
        setStudents(data.students);
        setOrphans(data.orphans ?? []);
      } else {
        toast.error(data.error || 'Erreur de chargement.');
      }
    } catch {
      toast.error('Impossible de charger les liaisons Discord.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(selectedPromo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPromo]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (linkFilter === 'linked' && !s.discordId) return false;
      if (linkFilter === 'unlinked' && s.discordId) return false;
      if (q) {
        const hay = `${s.firstName} ${s.lastName} ${s.login}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [students, linkFilter, search]);

  const stats = useMemo(() => {
    const total = students.length;
    const linked = students.filter((s) => s.discordId).length;
    const emailLogins = students.filter((s) => looksLikeEmail(s.login)).length;
    const pct = total > 0 ? Math.round((linked / total) * 100) : 0;
    return { total, linked, unlinked: total - linked, pct, emailLogins };
  }, [students]);

  // Per-promo coverage breakdown (only meaningful when viewing all promos).
  const perPromo = useMemo(() => {
    if (selectedPromo !== 'all') return [];
    const map = new Map<string, { total: number; linked: number }>();
    for (const s of students) {
      const key = s.promoName ?? '—';
      const e = map.get(key) ?? { total: 0, linked: 0 };
      e.total += 1;
      if (s.discordId) e.linked += 1;
      map.set(key, e);
    }
    return [...map.entries()]
      .map(([promo, v]) => ({ promo, ...v, pct: v.total ? Math.round((v.linked / v.total) * 100) : 0 }))
      .sort((a, b) => a.promo.localeCompare(b.promo));
  }, [students, selectedPromo]);

  const refresh = () => load(selectedPromo);

  return (
    <div className="page-container flex flex-col gap-4 md:gap-6 p-4 md:p-6">
      <PageHeader
        icon={MessageSquare}
        title="Liaison Discord"
        description="Qui a relié son Discord, par promotion. Modifiez les valeurs en ligne."
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

        <div className="inline-flex items-center gap-1 rounded-md border bg-muted/30 p-0.5">
          {([
            { k: 'all', label: 'Tous', count: stats.total },
            { k: 'linked', label: 'Liés', count: stats.linked },
            { k: 'unlinked', label: 'Non liés', count: stats.unlinked },
          ] as { k: LinkFilter; label: string; count: number }[]).map(({ k, label, count }) => (
            <button
              key={k}
              onClick={() => setLinkFilter(k)}
              className={cn(
                'h-7 px-2.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors',
                linkFilter === k
                  ? 'bg-background shadow-sm border'
                  : 'hover:bg-background/60 text-muted-foreground',
              )}
            >
              {label}
              <span className="text-[10px] tabular-nums opacity-70">{count}</span>
            </button>
          ))}
        </div>

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

      {/* Coverage stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Étudiants" value={stats.total} tone="blue" loading={loading} />
        <StatTile label="Discord lié" value={`${stats.linked} (${stats.pct}%)`} tone="emerald" loading={loading} />
        <StatTile label="Non lié" value={stats.unlinked} tone="amber" loading={loading} />
        <StatTile
          label="Login = email"
          value={stats.emailLogins}
          tone={stats.emailLogins > 0 ? 'rose' : 'blue'}
          loading={loading}
        />
      </div>

      {/* Per-promo coverage (all promos only) */}
      {selectedPromo === 'all' && !loading && perPromo.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Couverture par promotion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {perPromo.map((p) => (
              <div key={p.promo} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{p.promo}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {p.linked}/{p.total} ({p.pct}%)
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${p.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Orphan mappings warning */}
      {!loading && orphans.length > 0 && (
        <OrphanSection orphans={orphans} onChange={refresh} />
      )}

      {/* Main list */}
      {loading ? (
        <LoadingCard height="lg" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Aucun étudiant" />
      ) : (
        <Card>
          <CardContent className="p-0">
            {/* Desktop table */}
            <Table className="hidden md:table">
              <TableHeader>
                <TableRow>
                  <TableHead>Étudiant</TableHead>
                  <TableHead>Login</TableHead>
                  <TableHead>Promo</TableHead>
                  <TableHead>Discord ID</TableHead>
                  <TableHead className="w-[120px]">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <StudentTableRow key={s.id} student={s} onChange={refresh} />
                ))}
              </TableBody>
            </Table>

            {/* Mobile cards */}
            <ul className="md:hidden divide-y">
              {filtered.map((s) => (
                <StudentMobileCard key={s.id} student={s} onChange={refresh} />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  tone: 'blue' | 'emerald' | 'amber' | 'rose';
  loading?: boolean;
}) {
  const toneText: Record<string, string> = {
    blue: 'text-blue-700 dark:text-blue-400',
    emerald: 'text-emerald-700 dark:text-emerald-400',
    amber: 'text-amber-700 dark:text-amber-400',
    rose: 'text-rose-700 dark:text-rose-400',
  };
  return (
    <Card className="p-3">
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      {loading ? (
        <div className="h-7 w-16 mt-1 bg-muted rounded animate-pulse" />
      ) : (
        <p className={cn('text-xl md:text-2xl font-bold mt-1 tabular-nums', toneText[tone])}>{value}</p>
      )}
    </Card>
  );
}

/** Inline-editable Discord ID + link status, used in the desktop table. */
function StudentTableRow({ student, onChange }: { student: StudentRow; onChange: () => void }) {
  const emailLogin = looksLikeEmail(student.login);
  return (
    <TableRow className={cn(emailLogin && 'bg-rose-500/5')}>
      <TableCell>
        <div className="font-medium">
          {student.firstName} {student.lastName}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs">{student.login}</span>
          {emailLogin && (
            <Badge variant="outline" className={cn(PILL.rose, 'gap-1')} title="Le login ressemble à un email — le bot Discord ne pourra pas faire correspondre la liaison.">
              <AtSign className="h-3 w-3" />
              email
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="font-normal">{student.promoName ?? '—'}</Badge>
      </TableCell>
      <TableCell>
        <DiscordIdEditor login={student.login} discordId={student.discordId} onChange={onChange} />
      </TableCell>
      <TableCell>
        {student.discordId ? (
          <Badge variant="outline" className={cn(PILL.emerald, 'gap-1')}>
            <Link2 className="h-3 w-3" />
            Lié
          </Badge>
        ) : (
          <Badge variant="outline" className={cn(PILL.amber, 'gap-1')}>
            <Link2Off className="h-3 w-3" />
            Non lié
          </Badge>
        )}
      </TableCell>
    </TableRow>
  );
}

function StudentMobileCard({ student, onChange }: { student: StudentRow; onChange: () => void }) {
  const emailLogin = looksLikeEmail(student.login);
  return (
    <li className={cn('p-3 space-y-2', emailLogin && 'bg-rose-500/5')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium truncate">
            {student.firstName} {student.lastName}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-mono text-xs text-muted-foreground truncate">{student.login}</span>
            {emailLogin && (
              <Badge variant="outline" className={cn(PILL.rose, 'gap-1 shrink-0')}>
                <AtSign className="h-3 w-3" />
                email
              </Badge>
            )}
          </div>
        </div>
        {student.discordId ? (
          <Badge variant="outline" className={cn(PILL.emerald, 'gap-1 shrink-0')}>
            <Link2 className="h-3 w-3" />
            Lié
          </Badge>
        ) : (
          <Badge variant="outline" className={cn(PILL.amber, 'gap-1 shrink-0')}>
            <Link2Off className="h-3 w-3" />
            Non lié
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs">
        <Badge variant="outline" className="font-normal">{student.promoName ?? '—'}</Badge>
        <div className="flex-1">
          <DiscordIdEditor login={student.login} discordId={student.discordId} onChange={onChange} />
        </div>
      </div>
    </li>
  );
}

/** Click-to-edit Discord ID; supports set/update and unlink. */
function DiscordIdEditor({
  login,
  discordId,
  onChange,
}: {
  login: string;
  discordId: string | null;
  onChange: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(discordId ?? '');
  const [busy, setBusy] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState(false);

  const save = async () => {
    const v = value.trim();
    if (!v) {
      toast.error("Saisis un ID Discord (ou utilise le bouton de déliaison).");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/discord/manage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'setDiscordId', login, discordId: v }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Discord ID enregistré.');
        setEditing(false);
        onChange();
      } else {
        toast.error(data.error || 'Erreur.');
      }
    } catch {
      toast.error('Erreur réseau.');
    } finally {
      setBusy(false);
    }
  };

  const unlink = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/discord/manage', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Liaison supprimée.');
        setValue('');
        setEditing(false);
        setConfirmUnlink(false);
        onChange();
      } else {
        toast.error(data.error || 'Erreur.');
      }
    } catch {
      toast.error('Erreur réseau.');
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="ID Discord (chiffres)"
          className="h-7 text-xs font-mono w-[180px]"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') {
              setEditing(false);
              setValue(discordId ?? '');
            }
          }}
        />
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={save} disabled={busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-emerald-600" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => {
            setEditing(false);
            setValue(discordId ?? '');
          }}
          disabled={busy}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 group">
      {discordId ? (
        <span className="font-mono text-xs">{discordId}</span>
      ) : (
        <span className="text-xs text-muted-foreground italic">Non lié</span>
      )}
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => setEditing(true)}
        title={discordId ? 'Modifier' : 'Lier'}
      >
        <Pencil className="h-3 w-3" />
      </Button>
      {discordId && (
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
          onClick={() => setConfirmUnlink(true)}
          disabled={busy}
          title="Délier"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2Off className="h-3 w-3" />}
        </Button>
      )}

      <AlertDialog open={confirmUnlink} onOpenChange={setConfirmUnlink}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Délier le Discord ?</AlertDialogTitle>
            <AlertDialogDescription>
              La liaison Discord de <strong className="font-mono">{login}</strong> sera supprimée.
              L'étudiant devra relier son compte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                unlink();
              }}
              disabled={busy}
              className="bg-destructive hover:bg-destructive/90"
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                'Délier'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Orphan mappings (login matches no student) — editable login + discord id. */
function OrphanSection({ orphans, onChange }: { orphans: OrphanRow[]; onChange: () => void }) {
  return (
    <Card className="border-amber-500/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          Liaisons orphelines ({orphans.length})
        </CardTitle>
        <CardDescription>
          Ces liaisons Discord ne correspondent à aucun étudiant — souvent un email saisi à la place du
          login. Corrigez le login pour qu'il corresponde au handle de l'étudiant.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {orphans.map((o) => (
          <OrphanRowEditor key={o.id} orphan={o} onChange={onChange} />
        ))}
      </CardContent>
    </Card>
  );
}

function OrphanRowEditor({ orphan, onChange }: { orphan: OrphanRow; onChange: () => void }) {
  const [login, setLogin] = useState(orphan.login);
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const emailLogin = looksLikeEmail(orphan.login);
  const dirty = login.trim() !== orphan.login;

  const saveLogin = async () => {
    const v = login.trim();
    if (!v) return;
    setBusy(true);
    try {
      const res = await fetch('/api/discord/manage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'renameLogin', oldLogin: orphan.login, newLogin: v }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Login corrigé.');
        onChange();
      } else {
        toast.error(data.error || 'Erreur.');
      }
    } catch {
      toast.error('Erreur réseau.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/discord/manage', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: orphan.login }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Liaison supprimée.');
        setConfirmRemove(false);
        onChange();
      } else {
        toast.error(data.error || 'Erreur.');
      }
    } catch {
      toast.error('Erreur réseau.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-md border p-2">
      <div className="flex items-center gap-1.5 flex-1">
        <Input
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          className="h-7 text-xs font-mono"
          placeholder="login de l'étudiant"
        />
        {emailLogin && (
          <Badge variant="outline" className={cn(PILL.rose, 'gap-1 shrink-0')}>
            <AtSign className="h-3 w-3" />
            email
          </Badge>
        )}
      </div>
      <span className="font-mono text-[11px] text-muted-foreground sm:w-[180px] truncate">
        {orphan.discordId}
      </span>
      <div className="flex items-center gap-1 shrink-0">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={saveLogin} disabled={busy || !dirty}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Corriger'}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-destructive"
          onClick={() => setConfirmRemove(true)}
          disabled={busy}
          title="Supprimer la liaison"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette liaison orpheline ?</AlertDialogTitle>
            <AlertDialogDescription>
              La liaison <strong className="font-mono">{orphan.login}</strong> →{' '}
              <strong className="font-mono">{orphan.discordId}</strong> sera supprimée
              définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                remove();
              }}
              disabled={busy}
              className="bg-destructive hover:bg-destructive/90"
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                'Supprimer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
