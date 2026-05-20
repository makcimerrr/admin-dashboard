'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingCard } from '@/components/ui/loading-card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CheckCircle2, Send, ExternalLink, Archive, Trash2, X,
  Loader2, RefreshCw, AlertTriangle, ClipboardCheck,
  MoreHorizontal, ShieldAlert, CircleDot, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { PdfExportButton } from '@/components/code-reviews/pdf-export-button';
import { trackAccent } from '@/lib/track-colors';
import { PILL } from '@/lib/status-pills';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SuiviRow {
  id: number; groupId: string; promoId: string; projectName: string; status: string;
  captainLogin: string | null; notifiedAuditAt: string | null; lastSeenAt: string;
  slotDate: string | null; slotBookedAt: string | null; slotEventId: string | null;
  slotAttendeeEmail: string | null; hasDiscordId: boolean; track: string | null;
  auditId: number | null; auditCreatedAt: string | null; auditorName: string | null;
  manualReminderAt: string | null;
}

interface PromoInfo { eventId: number; title: string; key: string; }

type Category = 'overdue' | 'warning' | 'pending' | 'done';
type SortKey = 'project' | 'captain' | 'notif' | 'delay' | 'review';
type SortDir = 'asc' | 'desc';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtShort(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function daysSinceNotified(row: SuiviRow): number {
  if (!row.notifiedAuditAt) return 0;
  return (Date.now() - new Date(row.notifiedAuditAt).getTime()) / 86_400_000;
}

function categorize(row: SuiviRow): Category {
  if (row.auditId) return 'done';
  const days = daysSinceNotified(row);
  if (days >= 14) return 'overdue';
  if (days >= 10) return 'warning';
  return 'pending';
}

const STATUS_BADGE: Record<Category, { label: string; class: string }> = {
  overdue: { label: 'Dépassé', class: PILL.red },
  warning: { label: 'Warning', class: PILL.amber },
  pending: { label: 'Attente', class: PILL.blue },
  done: { label: 'Audité', class: PILL.emerald },
};

function shortPromo(name: string): string {
  const m = name.match(/promotion\s*(\d+)\s*[-–]\s*ann[ée]e\s*(\d{4})/i);
  if (m) return `P${m[1]}-${m[2]}`;
  if (name.length <= 10) return name;
  return name.slice(0, 10) + '…';
}

const TAB_CONFIG: { key: Category | 'all'; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'all', label: 'Tous', icon: ClipboardCheck, color: 'text-foreground' },
  { key: 'overdue', label: 'Dépassement', icon: ShieldAlert, color: 'text-red-600 dark:text-red-400' },
  { key: 'warning', label: 'Warning', icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400' },
  { key: 'pending', label: 'En attente', icon: CircleDot, color: 'text-blue-600 dark:text-blue-400' },
  { key: 'done', label: 'Audité', icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400' },
];

/**
 * Compute the "pourquoi" badge for a row — surfaces the dominant reason
 * a row is in warning/overdue so the user doesn't have to read multiple
 * columns to figure out what's blocking. Returns null when there's no
 * actionable reason (done or healthy pending rows).
 */
function whyBadge(
  row: SuiviRow,
  cat: Category,
): { label: string; tooltip: string; tone: string } | null {
  if (cat === 'done') return null;
  const tonesRed =
    'bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30';
  const tonesAmber =
    'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30';
  if (!row.captainLogin) {
    return {
      label: 'Pas de capitaine',
      tooltip: 'Aucun capitaine renseigné — impossible de notifier le groupe.',
      tone: tonesRed,
    };
  }
  if (!row.hasDiscordId) {
    return {
      label: 'Pas de Discord',
      tooltip: `${row.captainLogin} n'a pas encore lié son compte Discord — le DM ne peut pas être envoyé.`,
      tone: tonesAmber,
    };
  }
  if (cat === 'overdue' || cat === 'warning') {
    const days = Math.floor(
      row.notifiedAuditAt
        ? (Date.now() - new Date(row.notifiedAuditAt).getTime()) / 86_400_000
        : 0,
    );
    if (days > 0) {
      return {
        label: `${days}j sans audit`,
        tooltip: `Capitaine notifié il y a ${days} jour(s), audit toujours en attente.`,
        tone: cat === 'overdue' ? tonesRed : tonesAmber,
      };
    }
  }
  if (cat === 'pending' && !row.notifiedAuditAt) {
    return {
      label: 'Non notifié',
      tooltip: 'Le capitaine n\'a pas encore reçu de notification Discord.',
      tone: tonesAmber,
    };
  }
  return null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SuiviPage() {
  const [rows, setRows] = useState<SuiviRow[]>([]);
  // Promo info indexed by eventId (as string). We keep both `title` (long
  // form used for display) and `key` (short form like "P1 2025") so the
  // search bar can match either.
  const [promos, setPromos] = useState<Map<string, { title: string; key: string }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const [confirmDeleteRowState, setConfirmDeleteRowState] = useState<SuiviRow | null>(null);
  const [activeTab, setActiveTab] = useState<Category | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('delay');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkConfirmDelete, setBulkConfirmDelete] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Drag-to-select state. When the user mousedowns on a row's checkbox,
  // we remember the target state (add or remove) and apply it to every
  // row the cursor enters until mouseup.
  const dragRef = useRef<{ active: boolean; targetState: boolean }>({ active: false, targetState: true });
  const lastClickedIdRef = useRef<number | null>(null);

  useEffect(() => {
    const onMouseUp = () => { dragRef.current.active = false; };
    window.addEventListener('mouseup', onMouseUp);
    return () => window.removeEventListener('mouseup', onMouseUp);
  }, []);

  const fetchRows = useCallback(async () => {
    try {
      const [suiviRes, promosRes] = await Promise.all([
        fetch('/api/code-reviews/suivi'),
        fetch('/api/promotions/active'),
      ]);
      const [suiviData, promosData] = await Promise.all([suiviRes.json(), promosRes.json()]);
      if (suiviData?.success) setRows(suiviData.data.rows);
      if (promosData?.success) {
        const map = new Map<string, { title: string; key: string }>();
        for (const p of promosData.promotions as PromoInfo[]) {
          map.set(String(p.eventId), { title: p.title || p.key, key: p.key });
        }
        setPromos(map);
      }
    } catch { toast.error('Erreur lors du chargement'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const setRowLoading = (id: number, on: boolean) =>
    setLoadingIds(prev => { const s = new Set(prev); on ? s.add(id) : s.delete(id); return s; });

  const promoName = (id: string) => promos.get(id)?.title ?? id;
  const promoKey = (id: string) => promos.get(id)?.key ?? '';

  // ─── Actions ─────────────────────────────────────────────────────────────

  async function callResendDM(row: SuiviRow) {
    setRowLoading(row.id, true);
    try {
      const res = await fetch('/api/code-reviews/suivi/resend-dm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupStatusId: row.id }),
      });
      const data = await res.json();
      if (data?.success && data.data?.sent) {
        toast.success(`Relance envoyée à ${row.captainLogin}`);
      } else if (data?.success && data.data?.reason === 'no_discord') {
        toast.info(`${row.captainLogin} n'a pas de Discord lié`);
      } else if (data?.success && data.data?.reason === 'no_captain') {
        toast.info('Aucun capitaine renseigné');
      } else {
        toast.error(data?.error?.message ?? 'Échec');
      }
      await fetchRows();
    } catch { toast.error('Erreur réseau'); }
    finally { setRowLoading(row.id, false); }
  }

  async function handleDeleteRow(row: SuiviRow) {
    setRowLoading(row.id, true);
    try {
      const res = await fetch('/api/code-reviews/suivi', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id }),
      });
      const data = await res.json();
      if (data?.success) { toast.success('Supprimé'); await fetchRows(); }
      else toast.error(data?.error?.message ?? 'Erreur');
    } catch { toast.error('Erreur réseau'); }
    finally { setRowLoading(row.id, false); }
  }

  async function handleArchiveRow(row: SuiviRow) {
    setRowLoading(row.id, true);
    try {
      const res = await fetch('/api/code-reviews/suivi', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id }),
      });
      const data = await res.json();
      if (data?.success) { toast.success('Archivé'); await fetchRows(); }
      else toast.error(data?.error?.message ?? 'Erreur');
    } catch { toast.error('Erreur réseau'); }
    finally { setRowLoading(row.id, false); }
  }

  async function handleBulkArchive() {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await fetch('/api/code-reviews/suivi', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (data?.success) {
        toast.success(`${ids.length} ligne${ids.length > 1 ? 's' : ''} archivée${ids.length > 1 ? 's' : ''}`);
        setSelectedIds(new Set());
        await fetchRows();
      } else toast.error(data?.error?.message ?? 'Erreur');
    } catch { toast.error('Erreur réseau'); }
    finally { setBulkLoading(false); }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await fetch('/api/code-reviews/suivi', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (data?.success) {
        toast.success(`${ids.length} ligne${ids.length > 1 ? 's' : ''} supprimée${ids.length > 1 ? 's' : ''}`);
        setSelectedIds(new Set());
        await fetchRows();
      } else toast.error(data?.error?.message ?? 'Erreur');
    } catch { toast.error('Erreur réseau'); }
    finally { setBulkLoading(false); setBulkConfirmDelete(false); }
  }

  /**
   * Send a Discord DM to every selected captain that has Discord linked +
   * isn't already audited. Walks the rows sequentially so the toast feedback
   * tracks progress and we don't hammer the Discord API.
   */
  async function handleBulkRelance() {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    const idSet = selectedIds;
    const eligibleRows = rows.filter(
      (r) => idSet.has(r.id) && r.captainLogin && r.hasDiscordId && !r.auditId,
    );
    const skipped = idSet.size - eligibleRows.length;
    if (eligibleRows.length === 0) {
      toast.info('Aucune ligne éligible (pas de Discord ou déjà auditée).');
      setBulkLoading(false);
      return;
    }
    let sent = 0;
    let failed = 0;
    for (const row of eligibleRows) {
      try {
        const res = await fetch('/api/code-reviews/suivi/resend-dm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: row.id }),
        });
        const data = await res.json();
        if (data?.success && (!data.data?.reason || data.data.reason === 'sent'))
          sent += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }
    if (sent > 0) {
      toast.success(
        `${sent} relance${sent > 1 ? 's' : ''} envoyée${sent > 1 ? 's' : ''}` +
          (skipped > 0 ? ` · ${skipped} ignorée${skipped > 1 ? 's' : ''}` : '') +
          (failed > 0 ? ` · ${failed} échec${failed > 1 ? 's' : ''}` : ''),
      );
    } else if (failed > 0) {
      toast.error(`${failed} échec${failed > 1 ? 's' : ''}`);
    } else {
      toast.info('Rien à relancer.');
    }
    setSelectedIds(new Set());
    await fetchRows();
    setBulkLoading(false);
  }

  function toggleRowSelected(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** Set a row's selection state explicitly (used by drag). */
  function setRowSelected(id: number, on: boolean) {
    setSelectedIds(prev => {
      const has = prev.has(id);
      if (has === on) return prev;
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  /** mousedown on a row's checkbox cell — start a drag from this row. */
  function handleRowMouseDown(e: React.MouseEvent, id: number, currentlySelected: boolean) {
    // Shift+click → range selection from the last clicked row
    if (e.shiftKey && lastClickedIdRef.current !== null) {
      e.preventDefault();
      const ids = visibleRows.map(r => r.id);
      const fromIdx = ids.indexOf(lastClickedIdRef.current);
      const toIdx = ids.indexOf(id);
      if (fromIdx !== -1 && toIdx !== -1) {
        const [a, b] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
        const range = ids.slice(a, b + 1);
        const targetState = !currentlySelected;
        setSelectedIds(prev => {
          const next = new Set(prev);
          for (const rid of range) {
            if (targetState) next.add(rid);
            else next.delete(rid);
          }
          return next;
        });
      }
      lastClickedIdRef.current = id;
      return;
    }

    // Regular drag-to-select start
    e.preventDefault(); // avoid text selection during drag
    const targetState = !currentlySelected;
    dragRef.current = { active: true, targetState };
    setRowSelected(id, targetState);
    lastClickedIdRef.current = id;
  }

  /** mouseenter on a row's checkbox cell during drag — propagate state. */
  function handleRowMouseEnter(id: number) {
    if (!dragRef.current.active) return;
    setRowSelected(id, dragRef.current.targetState);
  }

  function toggleAllVisible(allChecked: boolean) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allChecked) {
        // remove visible
        for (const r of visibleRows) next.delete(r.id);
      } else {
        // add visible
        for (const r of visibleRows) next.add(r.id);
      }
      return next;
    });
  }

  // ─── Sort & filter ─────────────────────────────────────────────────────

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'delay' ? 'desc' : 'asc'); }
  };

  const active = rows.filter(r => r.status !== 'archived');
  const filtered = active.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.projectName.toLowerCase().includes(q) ||
      (r.captainLogin ?? '').toLowerCase().includes(q) ||
      promoName(r.promoId).toLowerCase().includes(q) ||
      promoKey(r.promoId).toLowerCase().includes(q) ||
      (r.track ?? '').toLowerCase().includes(q);
  });

  const grouped: Record<Category, SuiviRow[]> = { overdue: [], warning: [], pending: [], done: [] };
  filtered.forEach(r => grouped[categorize(r)].push(r));

  const counts = { total: active.length, overdue: grouped.overdue.length, warning: grouped.warning.length, pending: grouped.pending.length, done: grouped.done.length };

  const visibleRows = useMemo(() => {
    const categories: Category[] = activeTab === 'all'
      ? ['overdue', 'warning', 'pending', 'done']
      : [activeTab as Category];
    const list = categories.flatMap(cat => grouped[cat]);

    return [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'project': cmp = a.projectName.localeCompare(b.projectName); break;
        case 'captain': cmp = (a.captainLogin ?? '').localeCompare(b.captainLogin ?? ''); break;
        case 'notif': cmp = (a.notifiedAuditAt ?? '').localeCompare(b.notifiedAuditAt ?? ''); break;
        case 'delay': cmp = daysSinceNotified(a) - daysSinceNotified(b); break;
        case 'review': cmp = (a.auditCreatedAt ?? '').localeCompare(b.auditCreatedAt ?? ''); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [activeTab, grouped, sortKey, sortDir]);

  const showDoneColumns = activeTab === 'done' || activeTab === 'all';
  const showDelayColumn = activeTab !== 'done';

  // ─── Render ─────────────────────────────────────────────────────────────

  function SortHeader({ label, sortId }: { label: string; sortId: SortKey }) {
    const isActive = sortKey === sortId;
    return (
      <TableHead
        className="cursor-pointer select-none hover:text-foreground transition-colors"
        onClick={() => toggleSort(sortId)}
      >
        <div className="flex items-center gap-1">
          {label}
          {isActive ? (
            sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-30" />
          )}
        </div>
      </TableHead>
    );
  }

  return (
    <div className="page-container flex flex-col gap-4 p-4 md:p-6">
      {/* Header */}
      <PageHeader
        icon={ClipboardCheck}
        title="Suivi"
        description="Suivi des code reviews en attente"
      >
        <PdfExportButton />
      </PageHeader>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b">
        {loading ? (
          <Skeleton className="h-9 w-96" />
        ) : TAB_CONFIG.map(({ key, label, icon: Icon, color }) => {
          const count = key === 'all' ? counts.total : counts[key];
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${
                isActive
                  ? `${color} border-current`
                  : 'text-muted-foreground border-transparent hover:text-foreground hover:border-border'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                isActive ? 'bg-foreground/10' : 'bg-muted'
              }`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Search + selection hint */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Input
          placeholder="Rechercher par projet, capitaine, promotion, track..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="max-w-sm h-8 text-sm"
        />
        <p className="text-[10px] text-muted-foreground hidden sm:block">
          Astuce : maintiens le clic et glisse pour sélectionner plusieurs lignes · Shift+clic pour une plage
        </p>
      </div>

      {loading ? (
        <LoadingCard height="lg" />
      ) : visibleRows.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Aucun groupe à afficher" />
      ) : (() => {
        const visibleIds = visibleRows.map(r => r.id);
        const visibleSelectedCount = visibleIds.filter(id => selectedIds.has(id)).length;
        const allVisibleSelected = visibleRows.length > 0 && visibleSelectedCount === visibleRows.length;
        const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;
        return (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 [&>th]:py-2 [&>th]:text-[11px] [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wider [&>th]:text-muted-foreground">
                <TableHead className="w-[36px]">
                  <Checkbox
                    aria-label="Tout sélectionner"
                    checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
                    onCheckedChange={() => toggleAllVisible(allVisibleSelected)}
                  />
                </TableHead>
                {activeTab === 'all' && <TableHead className="w-[80px]">Statut</TableHead>}
                <SortHeader label="Projet" sortId="project" />
                <SortHeader label="Capitaine" sortId="captain" />
                <SortHeader label="Notification" sortId="notif" />
                {showDelayColumn && <SortHeader label="Délai" sortId="delay" />}
                {showDoneColumns && <SortHeader label="Review" sortId="review" />}
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map(row => {
                const cat = categorize(row);
                const badge = STATUS_BADGE[cat];
                const isLoading = loadingIds.has(row.id);
                const isSelected = selectedIds.has(row.id);

                return (
                  <TableRow
                    key={row.id}
                    data-state={isSelected ? 'selected' : undefined}
                    className="group hover:bg-muted/20 data-[state=selected]:bg-primary/5 [&>td]:py-2 [&>td]:text-[12px]"
                  >
                    {/* Selection cell. The cell itself is the interactive
                        element: mousedown starts a drag, mouseenter
                        propagates while dragging, Space/Enter toggles via
                        keyboard. The Checkbox inside is purely visual. */}
                    <TableCell
                      tabIndex={0}
                      role="checkbox"
                      aria-checked={isSelected}
                      aria-label={`Sélectionner ${row.projectName}`}
                      className="cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onMouseDown={(e) => handleRowMouseDown(e, row.id, isSelected)}
                      onMouseEnter={() => handleRowMouseEnter(row.id)}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          toggleRowSelected(row.id);
                          lastClickedIdRef.current = row.id;
                        }
                      }}
                    >
                      <Checkbox checked={isSelected} tabIndex={-1} aria-hidden />
                    </TableCell>
                    {/* Status */}
                    {activeTab === 'all' && (
                      <TableCell>
                        <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.class}`}>
                          {badge.label}
                        </span>
                      </TableCell>
                    )}

                    {/* Projet + track + promo + "pourquoi" badge */}
                    <TableCell>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{row.projectName}</span>
                        {row.track && (
                          <span
                            className="text-[10px] font-semibold"
                            style={{ color: trackAccent(row.track) }}
                          >
                            {row.track}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground/60">{shortPromo(promoName(row.promoId))}</span>
                        {whyBadge(row, cat) && (
                          <span
                            title={whyBadge(row, cat)?.tooltip}
                            className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${whyBadge(row, cat)!.tone}`}
                          >
                            {whyBadge(row, cat)!.label}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Capitaine */}
                    <TableCell>
                      {row.captainLogin ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[12px]">{row.captainLogin}</span>
                          <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${
                            row.hasDiscordId ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                          }`} title={row.hasDiscordId ? 'Discord lié' : 'Sans Discord'} />
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>

                    {/* Notification — smart unified action */}
                    <TableCell>
                      {cat === 'done' ? (
                        <span className="text-muted-foreground/40">—</span>
                      ) : !row.captainLogin ? (
                        <span className="text-amber-600 dark:text-amber-400 text-[10px]">Pas de capitaine</span>
                      ) : !row.hasDiscordId ? (
                        <span className="text-amber-600 dark:text-amber-400 text-[10px]" title="Le capitaine n'a pas lié son Discord">
                          Pas de Discord
                        </span>
                      ) : !row.notifiedAuditAt ? (
                        <Button
                          size="sm"
                          variant="default"
                          className="h-6 text-[10px] px-2 gap-1"
                          disabled={isLoading}
                          onClick={() => callResendDM(row)}
                          title="Envoyer la première notification Discord au capitaine"
                        >
                          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-2.5 w-2.5" />}
                          Envoyer
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] px-2 gap-1"
                            disabled={isLoading}
                            onClick={() => callResendDM(row)}
                            title={`Notifié ${fmtShort(row.notifiedAuditAt)} • Relancer`}
                          >
                            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-2.5 w-2.5" />}
                            Relancer
                          </Button>
                          {row.manualReminderAt && (
                            <span
                              className="text-[10px] text-muted-foreground"
                              title={`Dernière relance: ${fmtShort(row.manualReminderAt)}`}
                            >
                              {fmtShort(row.manualReminderAt)}
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>

                    {/* Délai */}
                    {showDelayColumn && (
                      <TableCell>
                        {(() => {
                          const days = Math.floor(daysSinceNotified(row));
                          if (days === 0) return <span className="text-muted-foreground/40">—</span>;
                          const left = 14 - days;
                          if (days >= 14) return <span className="text-red-600 dark:text-red-400 font-semibold text-[11px]">{days}j</span>;
                          if (days >= 10) return <span className="text-amber-600 dark:text-amber-400 text-[11px]">{days}j <span className="text-muted-foreground">({left}j rest.)</span></span>;
                          return <span className="text-muted-foreground text-[11px]">{days}j</span>;
                        })()}
                      </TableCell>
                    )}

                    {/* Review */}
                    {showDoneColumns && (
                      <TableCell>
                        {row.auditId ? (
                          <div>
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400">{fmtShort(row.auditCreatedAt)}</span>
                            {row.auditorName && <span className="text-[10px] text-muted-foreground ml-1">({row.auditorName})</span>}
                          </div>
                        ) : (
                          <a href={row.track
                            ? `/code-reviews/${row.promoId}/audit?groupId=${row.groupId}&project=${encodeURIComponent(row.projectName)}&track=${encodeURIComponent(row.track)}`
                            : `/code-reviews/${row.promoId}`}
                            className="text-[11px] text-primary hover:underline">
                            Saisir
                          </a>
                        )}
                      </TableCell>
                    )}

                    {/* Actions menu */}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost"
                            className="h-5 w-5 p-0 text-muted-foreground/40 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {row.auditId ? (
                            <DropdownMenuItem asChild>
                              <a href={`/code-reviews/${row.promoId}/group/${row.groupId}`}>
                                <ExternalLink className="mr-2 h-3.5 w-3.5" />Consulter la review
                              </a>
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem asChild>
                              <a href={row.track
                                ? `/code-reviews/${row.promoId}/audit?groupId=${row.groupId}&project=${encodeURIComponent(row.projectName)}&track=${encodeURIComponent(row.track)}`
                                : `/code-reviews/${row.promoId}`}>
                                <ExternalLink className="mr-2 h-3.5 w-3.5" />Saisir la review
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleArchiveRow(row)} disabled={isLoading}>
                            Archiver
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={e => { e.preventDefault(); setConfirmDeleteRowState(row); }}
                            className="text-destructive focus:text-destructive"
                          >
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        );
      })()}

      {/* Floating bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full border bg-background shadow-lg px-3 py-2">
          <span className="text-xs font-medium px-2 tabular-nums">
            {selectedIds.size} sélectionnée{selectedIds.size > 1 ? 's' : ''}
          </span>
          <div className="h-4 w-px bg-border" />
          <Button
            size="sm"
            variant="default"
            className="h-7 px-2 text-xs gap-1.5"
            disabled={bulkLoading}
            onClick={handleBulkRelance}
            title="Envoyer une relance Discord à tous les capitaines éligibles"
          >
            {bulkLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Relancer
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs gap-1.5"
            disabled={bulkLoading}
            onClick={handleBulkArchive}
          >
            {bulkLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
            Archiver
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
            disabled={bulkLoading}
            onClick={() => setBulkConfirmDelete(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Supprimer
          </Button>
          <div className="h-4 w-px bg-border" />
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground"
            onClick={() => setSelectedIds(new Set())}
            aria-label="Désélectionner tout"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Single-row delete confirmation */}
      <AlertDialog open={!!confirmDeleteRowState} onOpenChange={() => setConfirmDeleteRowState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette ligne ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est définitive.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (confirmDeleteRowState) handleDeleteRow(confirmDeleteRowState); setConfirmDeleteRowState(null); }}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation */}
      <AlertDialog open={bulkConfirmDelete} onOpenChange={setBulkConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Supprimer {selectedIds.size} ligne{selectedIds.size > 1 ? 's' : ''} ?
            </AlertDialogTitle>
            <AlertDialogDescription>Cette action est définitive et concerne toutes les lignes sélectionnées.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkLoading}
              onClick={(e) => { e.preventDefault(); handleBulkDelete(); }}
            >
              {bulkLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
