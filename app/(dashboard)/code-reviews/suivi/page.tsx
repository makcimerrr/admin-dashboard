'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CheckCircle2, XCircle, Crown, Send, Calendar, Link2, Link2Off, ExternalLink,
  Loader2, RefreshCw, AlertTriangle, Clock, MessageSquareOff, ClipboardCheck,
  MoreHorizontal, ShieldAlert, Timer, CircleDot,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SuiviRow {
  id: number; groupId: string; promoId: string; projectName: string; status: string;
  captainLogin: string | null; notifiedAuditAt: string | null; lastSeenAt: string;
  slotDate: string | null; slotBookedAt: string | null; slotEventId: string | null;
  slotAttendeeEmail: string | null; hasDiscordId: boolean; track: string | null;
  auditId: number | null; auditCreatedAt: string | null; auditorName: string | null;
}

interface CalendarEvent {
  id: string; summary: string; startDateTime: string; endDateTime: string;
  attendees: { email: string; displayName?: string }[]; htmlLink: string;
  reviewerName?: string; reviewerId?: number;
}

interface PromoInfo { eventId: number; title: string; key: string; }

type Category = 'overdue' | 'warning' | 'pending' | 'done';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}
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
  // Overdue/warning regardless of whether slot is booked
  if (days >= 14) return 'overdue';
  if (days >= 10) return 'warning';
  return 'pending';
}

const TRACK_COLORS: Record<string, string> = {
  Golang: 'text-cyan-600 dark:text-cyan-400',
  Javascript: 'text-yellow-600 dark:text-yellow-400',
  Rust: 'text-orange-600 dark:text-orange-400',
  Java: 'text-red-600 dark:text-red-400',
};

const STATUS_BADGE: Record<Category, { label: string; class: string }> = {
  overdue: { label: 'Dépassé', class: 'bg-red-500/15 text-red-700 dark:text-red-400' },
  warning: { label: 'Warning', class: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  pending: { label: 'Attente', class: 'bg-blue-500/15 text-blue-700 dark:text-blue-400' },
  done: { label: 'Audité', class: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
};

function shortPromo(name: string): string {
  // "Promotion 1 - Année 2025" → "P1-2025"
  const m = name.match(/promotion\s*(\d+)\s*[-–]\s*ann[ée]e\s*(\d{4})/i);
  if (m) return `P${m[1]}-${m[2]}`;
  // "P1 2025" already short
  if (name.length <= 10) return name;
  return name.slice(0, 10) + '…';
}

const SECTION_CONFIG: Record<Category, { title: string; icon: React.ElementType; color: string; emptyText: string }> = {
  overdue: { title: 'Dépassement (>14 jours)', icon: ShieldAlert, color: 'text-red-600', emptyText: 'Aucun groupe en dépassement' },
  warning: { title: 'Warning (10-14 jours)', icon: AlertTriangle, color: 'text-amber-600', emptyText: 'Aucun groupe en warning' },
  pending: { title: 'En attente', icon: CircleDot, color: 'text-blue-600', emptyText: 'Aucun groupe en attente' },
  done: { title: 'Audité', icon: CheckCircle2, color: 'text-emerald-600', emptyText: 'Aucun audit effectué' },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function SuiviPage() {
  const [rows, setRows] = useState<SuiviRow[]>([]);
  const [promos, setPromos] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const [confirmDeleteRowState, setConfirmDeleteRowState] = useState<SuiviRow | null>(null);

  const [activeTab, setActiveTab] = useState<Category | 'all'>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTargetId, setSheetTargetId] = useState<number | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarConfigured, setCalendarConfigured] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);

  const fetchRows = useCallback(async () => {
    try {
      const [suiviRes, promosRes] = await Promise.all([
        fetch('/api/code-reviews/suivi'),
        fetch('/api/promotions'),
      ]);
      const [suiviData, promosData] = await Promise.all([suiviRes.json(), promosRes.json()]);
      if (suiviData.success) setRows(suiviData.rows);
      if (promosData.success) {
        const map = new Map<string, string>();
        for (const p of promosData.promotions as PromoInfo[]) map.set(String(p.eventId), p.title || p.key);
        setPromos(map);
      }
    } catch { toast.error('Erreur lors du chargement'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const setRowLoading = (id: number, on: boolean) =>
    setLoadingIds(prev => { const s = new Set(prev); on ? s.add(id) : s.delete(id); return s; });

  const promoName = (id: string) => promos.get(id) ?? id;

  // ─── Actions ─────────────────────────────────────────────────────────────

  async function callResendDM(row: SuiviRow, silent = false) {
    setRowLoading(row.id, true);
    try {
      const res = await fetch('/api/code-reviews/suivi/resend-dm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupStatusId: row.id }),
      });
      const data = await res.json();
      if (data.success) toast.success(`Rappel envoyé à ${row.captainLogin}`);
      else if (!silent) {
        if (data.reason === 'no_discord') toast.info(`${row.captainLogin} n'a pas de Discord lié`);
        else if (data.reason === 'no_captain') toast.info('Aucun capitaine renseigné');
        else toast.error(data.error ?? 'Échec');
      }
      await fetchRows();
    } catch { toast.error('Erreur réseau'); }
    finally { setRowLoading(row.id, false); }
  }

  async function handleUnlinkSlot(row: SuiviRow) {
    setRowLoading(row.id, true);
    try {
      const res = await fetch('/api/code-reviews/suivi/link-slot', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupStatusId: row.id, action: 'unlink' }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Créneau délié'); await fetchRows(); }
      else toast.error(data.error ?? 'Erreur');
    } catch { toast.error('Erreur réseau'); }
    finally { setRowLoading(row.id, false); }
  }

  async function openCalendarSheet(rowId: number) {
    setSheetTargetId(rowId); setSheetOpen(true); setCalendarLoading(true);
    try {
      const res = await fetch('/api/code-reviews/suivi/calendar');
      const data = await res.json();
      setCalendarConfigured(data.configured ?? false);
      const usedIds = new Set(rows.map(r => r.slotEventId).filter(Boolean));
      setCalendarEvents((data.events ?? []).filter((e: CalendarEvent) => !usedIds.has(e.id)));
    } catch { toast.error('Erreur calendrier'); }
    finally { setCalendarLoading(false); }
  }

  async function handleLinkSlot(event: CalendarEvent) {
    if (!sheetTargetId) return;
    setCalendarLoading(true);
    try {
      const res = await fetch('/api/code-reviews/suivi/link-slot', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupStatusId: sheetTargetId, slotDate: event.startDateTime,
          slotEventId: event.id, slotAttendeeEmail: event.attendees[0]?.email ?? null,
        }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Créneau associé'); setSheetOpen(false); await fetchRows(); }
      else toast.error(data.error ?? 'Erreur');
    } catch { toast.error('Erreur réseau'); }
    finally { setCalendarLoading(false); }
  }

  async function handleDeleteRow(row: SuiviRow) {
    setRowLoading(row.id, true);
    try {
      const res = await fetch('/api/code-reviews/suivi', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Supprimé'); await fetchRows(); }
      else toast.error(data.error ?? 'Erreur');
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
      if (data.success) { toast.success('Archivé'); await fetchRows(); }
      else toast.error(data.error ?? 'Erreur');
    } catch { toast.error('Erreur réseau'); }
    finally { setRowLoading(row.id, false); }
  }

  // ─── Categorize & filter ────────────────────────────────────────────────

  const active = rows.filter(r => r.status !== 'archived');
  const filtered = active.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.projectName.toLowerCase().includes(q) ||
      (r.captainLogin ?? '').toLowerCase().includes(q) ||
      promoName(r.promoId).toLowerCase().includes(q) ||
      (r.track ?? '').toLowerCase().includes(q);
  });

  const grouped: Record<Category, SuiviRow[]> = { overdue: [], warning: [], pending: [], done: [] };
  filtered.forEach(r => grouped[categorize(r)].push(r));

  const counts = { total: active.length, overdue: grouped.overdue.length, warning: grouped.warning.length, pending: grouped.pending.length, done: grouped.done.length };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="page-container flex flex-col gap-4 md:gap-6 p-4 md:p-6">
      {/* Header */}
      <PageHeader icon={ClipboardCheck} title="Suivi Notifications" description="Suivi des notifications d'audit" />

      {/* Tab navigation as stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {loading ? Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        )) : (
          <>
            <TabCard active={activeTab === 'all'} onClick={() => setActiveTab('all')}
              label="Tous" count={counts.total} icon={ClipboardCheck} color="text-foreground" bg="bg-muted/50" activeBorder="border-foreground/30" />
            <TabCard active={activeTab === 'overdue'} onClick={() => setActiveTab('overdue')}
              label="Dépassement" count={counts.overdue} icon={ShieldAlert} color="text-red-600" bg="bg-red-50 dark:bg-red-950/20" activeBorder="border-red-400" />
            <TabCard active={activeTab === 'warning'} onClick={() => setActiveTab('warning')}
              label="Warning" count={counts.warning} icon={AlertTriangle} color="text-amber-600" bg="bg-amber-50 dark:bg-amber-950/20" activeBorder="border-amber-400" />
            <TabCard active={activeTab === 'pending'} onClick={() => setActiveTab('pending')}
              label="En attente" count={counts.pending} icon={CircleDot} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-950/20" activeBorder="border-blue-400" />
            <TabCard active={activeTab === 'done'} onClick={() => setActiveTab('done')}
              label="Audité" count={counts.done} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-950/20" activeBorder="border-emerald-400" />
          </>
        )}
      </div>

      {/* Search */}
      <Input
        placeholder="Rechercher par projet, capitaine, promotion, track..."
        value={search} onChange={e => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {loading ? (
        <Skeleton className="h-64 rounded-lg" />
      ) : (() => {
        const visibleCategories: Category[] = activeTab === 'all'
          ? ['overdue', 'warning', 'pending', 'done']
          : [activeTab as Category];
        const visibleRows = visibleCategories.flatMap(cat => grouped[cat]);
        const showDoneColumns = activeTab === 'done' || activeTab === 'all';
        const showDelayColumn = activeTab !== 'done';

        if (visibleRows.length === 0) {
          const config = activeTab === 'all' ? null : SECTION_CONFIG[activeTab as Category];
          return (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <ClipboardCheck className="h-8 w-8 opacity-30" />
              <p className="text-sm">{config?.emptyText ?? 'Aucun groupe à afficher.'}</p>
            </div>
          );
        }

        return (
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 [&>th]:py-2 [&>th]:text-[11px] [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wider [&>th]:text-muted-foreground">
                  {activeTab === 'all' && <TableHead className="w-[80px]">Statut</TableHead>}
                  <TableHead>Projet</TableHead>
                  <TableHead>Capitaine</TableHead>
                  <TableHead>Notif</TableHead>
                  <TableHead>Créneau</TableHead>
                  {showDelayColumn && <TableHead>Délai</TableHead>}
                  {showDoneColumns && <TableHead>Review</TableHead>}
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.map(row => {
                  const cat = categorize(row);
                  const badge = STATUS_BADGE[cat];

                  return (
                    <TableRow key={row.id} className="group hover:bg-muted/20 [&>td]:py-2 [&>td]:text-[12px]">
                      {/* Status */}
                      {activeTab === 'all' && (
                        <TableCell>
                          <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.class}`}>
                            {badge.label}
                          </span>
                        </TableCell>
                      )}

                      {/* Projet + track + promo inline */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{row.projectName}</span>
                          {row.track && (
                            <span className={`text-[10px] font-semibold ${TRACK_COLORS[row.track] ?? 'text-muted-foreground'}`}>
                              {row.track}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground/60">{shortPromo(promoName(row.promoId))}</span>
                        </div>
                      </TableCell>

                      {/* Capitaine */}
                      <TableCell>
                        {row.captainLogin ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[12px]">{row.captainLogin}</span>
                            {row.hasDiscordId ? (
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" title="Discord lié" />
                            ) : (
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/30 shrink-0" title="Sans Discord" />
                            )}
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>

                      {/* Notification */}
                      <TableCell>
                        {row.notifiedAuditAt && row.hasDiscordId ? (
                          <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">{fmtShort(row.notifiedAuditAt)}</span>
                        ) : row.notifiedAuditAt && !row.hasDiscordId ? (
                          <span className="text-amber-600 text-[11px]">Pas de Discord</span>
                        ) : !row.hasDiscordId ? (
                          <span className="text-muted-foreground/50 text-[11px]">—</span>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-5 text-[10px] px-2 gap-1 text-primary"
                            disabled={loadingIds.has(row.id)} onClick={() => callResendDM(row)}>
                            {loadingIds.has(row.id) ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-2.5 w-2.5" />}
                            Envoyer
                          </Button>
                        )}
                      </TableCell>

                      {/* Créneau */}
                      <TableCell>
                        {row.slotDate ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">{fmtShort(row.slotDate)}</span>
                            <button
                              className="text-muted-foreground/40 hover:text-destructive transition-colors"
                              disabled={loadingIds.has(row.id)} onClick={() => handleUnlinkSlot(row)} title="Délier">
                              <Link2Off className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-5 text-[10px] px-2 gap-1 text-primary"
                            onClick={() => openCalendarSheet(row.id)}>
                            <Calendar className="h-2.5 w-2.5" />
                            Associer
                          </Button>
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

                      {/* Actions */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost"
                              className="h-5 w-5 p-0 text-muted-foreground/40 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => callResendDM(row, true)} disabled={loadingIds.has(row.id)}>
                              <RefreshCw className="mr-2 h-3.5 w-3.5" />Renvoyer DM
                            </DropdownMenuItem>
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
                            <DropdownMenuItem onClick={() => handleArchiveRow(row)} disabled={loadingIds.has(row.id)}>
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

      {/* Calendar Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-[480px] sm:w-[480px] flex flex-col p-0">
          <div className="px-6 pt-6 pb-4 border-b">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />
                Associer un créneau
              </SheetTitle>
            </SheetHeader>
            {!calendarLoading && calendarConfigured && calendarEvents.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {calendarEvents.length} créneau{calendarEvents.length > 1 ? 'x' : ''} disponible{calendarEvents.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {calendarLoading ? (
              <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Chargement des créneaux...</span>
              </div>
            ) : !calendarConfigured ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 text-sm space-y-2">
                <p className="font-semibold text-amber-800 dark:text-amber-400">Google Calendar non configuré</p>
                <ul className="font-mono text-[10px] text-amber-700 dark:text-amber-500 space-y-0.5 list-disc list-inside">
                  <li>GOOGLE_CALENDAR_ID</li>
                  <li>GOOGLE_SERVICE_ACCOUNT_EMAIL</li>
                  <li>GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY</li>
                </ul>
              </div>
            ) : calendarEvents.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-muted-foreground">
                <Calendar className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">Aucun créneau disponible</p>
              </div>
            ) : (
              calendarEvents.map(event => (
                <div key={event.id} className="group rounded-lg border bg-card hover:border-primary/30 hover:shadow-sm transition-all p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    {event.reviewerName ? (
                      <Badge variant="secondary" className="text-[10px] font-semibold px-2 py-0.5 bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                        {event.reviewerName}
                      </Badge>
                    ) : event.attendees.length > 0 ? (
                      <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                        {event.attendees[0].displayName || event.attendees[0].email.split('@')[0]}
                      </Badge>
                    ) : <span />}
                    <a href={event.htmlLink} target="_blank" rel="noopener noreferrer"
                      className="text-muted-foreground/50 hover:text-foreground transition-colors">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="text-sm font-medium leading-snug truncate">{event.summary}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span>
                      {new Date(event.startDateTime).toLocaleString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      {' - '}
                      {new Date(event.endDateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <Button size="sm" className="w-full h-7 text-xs gap-1.5 mt-1" onClick={() => handleLinkSlot(event)}>
                    <Link2 className="h-3 w-3" />
                    Associer ce créneau
                  </Button>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
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
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function TabCard({ label, count, icon: Icon, color, bg, active, onClick, activeBorder }: {
  label: string; count: number; icon: React.ElementType; color: string; bg: string;
  active: boolean; onClick: () => void; activeBorder: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border-2 p-3 text-left transition-all ${bg} ${
        active ? `${activeBorder} shadow-sm` : 'border-transparent hover:border-border/50'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className={`text-2xl font-bold ${color}`}>{count}</p>
    </button>
  );
}
