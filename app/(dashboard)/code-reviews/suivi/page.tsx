'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  CheckCircle2,
  XCircle,
  Crown,
  Send,
  Calendar,
  Link2,
  Link2Off,
  ExternalLink,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Clock,
  MessageSquareOff,
  ClipboardCheck,
  MoreHorizontal,
} from 'lucide-react';

interface SuiviRow {
  id: number;
  groupId: string;
  promoId: string;
  projectName: string;
  status: string;
  captainLogin: string | null;
  notifiedAuditAt: string | null;
  lastSeenAt: string;
  slotDate: string | null;
  slotBookedAt: string | null;
  slotEventId: string | null;
  slotAttendeeEmail: string | null;
  hasDiscordId: boolean;
  track: string | null;
  auditId: number | null;
  auditCreatedAt: string | null;
  auditorName: string | null;
}

interface CalendarEvent {
  id: string;
  summary: string;
  startDateTime: string;
  endDateTime: string;
  attendees: { email: string; displayName?: string }[];
  htmlLink: string;
}

interface PromoInfo {
  eventId: number;
  title: string;
  key: string;
}

function fmt(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  });
}

const TRACK_COLORS: Record<string, string> = {
  Golang:     'bg-sky-500/10 text-sky-700 border-sky-200',
  Javascript: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
  Rust:       'bg-orange-500/10 text-orange-700 border-orange-200',
  Java:       'bg-red-500/10 text-red-700 border-red-200',
};

export default function SuiviPage() {
  const [rows, setRows] = useState<SuiviRow[]>([]);
  const [promos, setPromos] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const [confirmDeleteRowState, setConfirmDeleteRowState] = useState<SuiviRow | null>(null);

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
      const [suiviData, promosData] = await Promise.all([
        suiviRes.json(),
        promosRes.json(),
      ]);
      if (suiviData.success) setRows(suiviData.rows);
      if (promosData.success) {
        const map = new Map<string, string>();
        for (const p of promosData.promotions as PromoInfo[]) {
          map.set(String(p.eventId), p.title || p.key);
        }
        setPromos(map);
      }
    } catch {
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const setRowLoading = (id: number, on: boolean) =>
    setLoadingIds((prev) => { const s = new Set(prev); on ? s.add(id) : s.delete(id); return s; });

  async function callResendDM(row: SuiviRow, silent = false) {
    setRowLoading(row.id, true);
    try {
      const res = await fetch('/api/code-reviews/suivi/resend-dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupStatusId: row.id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Message envoyé à ${row.captainLogin}`);
      } else if (!silent) {
        if (data.reason === 'no_discord') toast.info(`${row.captainLogin} n'a pas de compte Discord lié`);
        else if (data.reason === 'no_captain') toast.info('Aucun capitaine renseigné pour ce groupe');
        else toast.error(data.error ?? 'Échec de l\'envoi');
      } else if (data.reason === 'no_discord') {
        toast.info(`${row.captainLogin} n'a toujours pas de compte Discord lié`);
      }
      await fetchRows();
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setRowLoading(row.id, false);
    }
  }

  async function handleUnlinkSlot(row: SuiviRow) {
    setRowLoading(row.id, true);
    try {
      const res = await fetch('/api/code-reviews/suivi/link-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupStatusId: row.id, action: 'unlink' }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Créneau délié'); await fetchRows(); }
      else toast.error(data.error ?? 'Erreur lors de la suppression du lien');
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setRowLoading(row.id, false);
    }
  }

  async function openCalendarSheet(rowId: number) {
    setSheetTargetId(rowId);
    setSheetOpen(true);
    setCalendarLoading(true);
    try {
      const res = await fetch('/api/code-reviews/suivi/calendar');
      const data = await res.json();
      setCalendarConfigured(data.configured ?? false);
      const usedEventIds = new Set(rows.map((r) => r.slotEventId).filter(Boolean));
      setCalendarEvents((data.events ?? []).filter((e: CalendarEvent) => !usedEventIds.has(e.id)));
    } catch {
      toast.error('Erreur lors du chargement du calendrier');
    } finally {
      setCalendarLoading(false);
    }
  }

  async function handleLinkSlot(event: CalendarEvent) {
    if (!sheetTargetId) return;
    setCalendarLoading(true);
    try {
      const res = await fetch('/api/code-reviews/suivi/link-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupStatusId: sheetTargetId,
          slotDate: event.startDateTime,
          slotEventId: event.id,
          slotAttendeeEmail: event.attendees[0]?.email ?? null,
        }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Créneau lié'); setSheetOpen(false); await fetchRows(); }
      else toast.error(data.error ?? 'Erreur lors du lien');
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setCalendarLoading(false);
    }
  }

  function getSlotDeadline(row: SuiviRow): 'overdue' | 'warning' | null {
    if (!row.notifiedAuditAt || !row.hasDiscordId || row.slotDate) return null;
    const days = (Date.now() - new Date(row.notifiedAuditAt).getTime()) / 86_400_000;
    if (days >= 14) return 'overdue';
    if (days >= 10) return 'warning';
    return null;
  }

  const promoName = (id: string) => promos.get(id) ?? id;

  const filtered = rows.filter((r) => {
    if (r.status === 'archived') return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const pName = promoName(r.promoId).toLowerCase();
    return (
      r.projectName.toLowerCase().includes(q) ||
      (r.captainLogin ?? '').toLowerCase().includes(q) ||
      pName.includes(q) ||
      (r.track ?? '').toLowerCase().includes(q)
    );
  });

  const zone01Count = rows.length;
  const dmCount    = rows.filter((r) => r.notifiedAuditAt && r.hasDiscordId).length;
  const slotCount  = rows.filter((r) => r.slotDate).length;
  const auditCount = rows.filter((r) => r.auditId).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Suivi des notifications</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pipeline : groupe en audit → notification Discord → créneau réservé → code review effectuée
        </p>
      </div>

      {/* Funnel */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-2">
              <Skeleton className="h-5 w-12 rounded" />
              <Skeleton className="h-8 w-10 rounded" />
              <Skeleton className="h-3 w-28 rounded" />
            </div>
          ))
        ) : (
          <>
            <FunnelCard label="En attente de review" count={zone01Count} color="amber" step={1} />
            <FunnelCard label="Notification envoyée" count={dmCount}    color="blue"   step={2} />
            <FunnelCard label="Créneau réservé"       count={slotCount}  color="violet" step={3} />
            <FunnelCard label="Code review effectuée" count={auditCount} color="green"  step={4} />
          </>
        )}
      </div>

      {/* Search */}
      <Input
        placeholder="Rechercher par projet, capitaine, promotion, tronc…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {/* Table */}
      {loading ? (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                {['Projet', 'Capitaine', 'Statut Zone01', 'Notification Discord', 'Créneau agenda', 'Code review', 'Actions'].map((h) => (
                  <TableHead key={h} className="font-semibold">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="align-top">
                  <TableCell className="py-3">
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <div className="flex gap-1.5">
                        <Skeleton className="h-4 w-16 rounded-full" />
                        <Skeleton className="h-4 w-20 rounded-full" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16 rounded-full" />
                    </div>
                  </TableCell>
                  <TableCell className="py-3"><Skeleton className="h-5 w-28 rounded-full" /></TableCell>
                  <TableCell className="py-3">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </TableCell>
                  <TableCell className="py-3"><Skeleton className="h-7 w-36 rounded-md" /></TableCell>
                  <TableCell className="py-3"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="py-3">
                    <div className="opacity-30">
                      <Skeleton className="h-7 w-7 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <ClipboardCheck className="h-8 w-8 opacity-30" />
          <p className="text-sm">Aucun groupe en attente de code review.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[220px] font-semibold">Projet</TableHead>
                <TableHead className="font-semibold">Capitaine</TableHead>
                <TableHead className="font-semibold">Statut Zone01</TableHead>
                <TableHead className="font-semibold">Notification Discord</TableHead>
                <TableHead className="font-semibold">Créneau agenda</TableHead>
                <TableHead className="font-semibold">Code review</TableHead>
                <TableHead className="font-semibold w-[60px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id} className="align-top group hover:bg-muted/40 transition-colors">

                  {/* Projet */}
                  <TableCell className="py-3">
                    <div className="space-y-1">
                      <p className="font-medium text-sm leading-tight">{row.projectName}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {row.track && (
                          <Badge variant="outline" className={`text-[11px] px-1.5 py-0 ${TRACK_COLORS[row.track] ?? ''}`}>
                            {row.track}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[11px] px-1.5 py-0 text-muted-foreground">
                          {promoName(row.promoId)}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>

                  {/* Capitaine */}
                  <TableCell className="py-3">
                    {row.captainLogin ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span className="text-sm font-mono">{row.captainLogin}</span>
                        </div>
                        {row.hasDiscordId ? (
                          <Badge className="text-[11px] px-1.5 py-0 bg-emerald-500/10 text-emerald-700 border-emerald-200 hover:bg-emerald-500/10">
                            Discord lié
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[11px] px-1.5 py-0 text-muted-foreground">
                            Sans Discord
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>

                  {/* Statut Zone01 */}
                  <TableCell className="py-3">
                    {row.status === 'audit' ? (
                      <Badge className="bg-amber-500/10 text-amber-700 border-amber-200 hover:bg-amber-500/10 text-xs">
                        En cours d'audit
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200 hover:bg-emerald-500/10 text-xs">
                        Terminé
                      </Badge>
                    )}
                  </TableCell>

                  {/* Notification Discord */}
                  <TableCell className="py-3">
                    {row.notifiedAuditAt && row.hasDiscordId ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-emerald-700">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span className="text-xs font-medium">Envoyé</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground pl-5">{fmt(row.notifiedAuditAt)}</p>
                      </div>
                    ) : row.notifiedAuditAt && !row.hasDiscordId ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-amber-600">
                          <MessageSquareOff className="h-4 w-4 shrink-0" />
                          <span className="text-xs font-medium">Non envoyé</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground pl-5">Traité le {fmt(row.notifiedAuditAt)}</p>
                        <p className="text-[11px] text-muted-foreground pl-5">Pas de Discord au moment de l'envoi</p>
                      </div>
                    ) : !row.hasDiscordId ? (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <XCircle className="h-4 w-4 shrink-0" />
                        <span className="text-xs">Aucun Discord lié</span>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5"
                        disabled={loadingIds.has(row.id)}
                        onClick={() => callResendDM(row)}
                      >
                        {loadingIds.has(row.id)
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <Send className="h-3 w-3" />}
                        Envoyer
                      </Button>
                    )}
                  </TableCell>

                  {/* Créneau */}
                  <TableCell className="py-3">
                    {row.slotDate ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                          <span className="text-xs font-medium text-emerald-700">{fmtShort(row.slotDate)}</span>
                          <Button
                            size="sm" variant="ghost"
                            className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive ml-0.5"
                            disabled={loadingIds.has(row.id)}
                            onClick={() => handleUnlinkSlot(row)}
                            title="Délier ce créneau"
                          >
                            {loadingIds.has(row.id)
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <Link2Off className="h-3 w-3" />}
                          </Button>
                        </div>
                        {row.slotAttendeeEmail && (
                          <p className="text-[11px] text-muted-foreground pl-5 truncate max-w-[180px]" title={row.slotAttendeeEmail}>
                            {row.slotAttendeeEmail}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Button
                          size="sm" variant="outline"
                          className="h-7 text-xs gap-1.5"
                          onClick={() => openCalendarSheet(row.id)}
                        >
                          <Calendar className="h-3 w-3" />
                          Associer un créneau
                        </Button>
                        {(() => {
                          const d = getSlotDeadline(row);
                          if (d === 'overdue') return (
                            <div className="flex items-center gap-1 text-red-600">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              <span className="text-[11px] font-medium">Délai de 2 semaines dépassé</span>
                            </div>
                          );
                          if (d === 'warning') {
                            const left = 14 - Math.floor((Date.now() - new Date(row.notifiedAuditAt!).getTime()) / 86_400_000);
                            return (
                              <div className="flex items-center gap-1 text-amber-600">
                                <Clock className="h-3 w-3 shrink-0" />
                                <span className="text-[11px]">Plus que {left} jour{left > 1 ? 's' : ''}</span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </TableCell>

                  {/* Code review */}
                  <TableCell className="py-3">
                    {row.auditId ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-emerald-700">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span className="text-xs font-medium">Effectuée</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground pl-5">{fmtShort(row.auditCreatedAt)}</p>
                        {row.auditorName && (
                          <p className="text-[11px] text-muted-foreground pl-5">{row.auditorName}</p>
                        )}
                      </div>
                    ) : (
                      <a
                        href={
                          row.track
                            ? `/code-reviews/${row.promoId}/audit?groupId=${row.groupId}&project=${encodeURIComponent(row.projectName)}&track=${encodeURIComponent(row.track)}`
                            : `/code-reviews/${row.promoId}`
                        }
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Saisir la review
                      </a>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => callResendDM(row, true)}
                          disabled={loadingIds.has(row.id)}
                        >
                          {loadingIds.has(row.id)
                            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            : <RefreshCw className="mr-2 h-4 w-4" />}
                          Rafraîchir
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleArchiveRow(row)}
                          disabled={loadingIds.has(row.id)}
                        >
                          {loadingIds.has(row.id)
                            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            : null}
                          Archiver
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={(e) => { e.preventDefault(); setConfirmDeleteRowState(row); }}
                          disabled={loadingIds.has(row.id)}
                          className="text-destructive focus:text-destructive hover:bg-destructive/10"
                        >
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Calendar Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-[480px] sm:w-[480px] flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Associer un créneau Google Agenda
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 flex-1 overflow-y-auto space-y-3 pr-1">
            {calendarLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Chargement des événements…</span>
              </div>
            ) : !calendarConfigured ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm space-y-2">
                <p className="font-semibold text-amber-800">Google Calendar non configuré</p>
                <p className="text-amber-700 text-sm">Configurez les variables d'environnement suivantes :</p>
                <ul className="font-mono text-xs text-amber-700 space-y-1 list-disc list-inside">
                  <li>GOOGLE_CALENDAR_ID</li>
                  <li>GOOGLE_SERVICE_ACCOUNT_EMAIL</li>
                  <li>GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY</li>
                </ul>
              </div>
            ) : calendarEvents.length === 0 ? (
              <p className="text-muted-foreground text-sm py-6 text-center">
                Aucun créneau disponible à associer.
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">{calendarEvents.length} créneau{calendarEvents.length > 1 ? 'x' : ''} disponible{calendarEvents.length > 1 ? 's' : ''}</p>
                {calendarEvents.map((event) => (
                  <div key={event.id} className="flex items-start justify-between gap-3 rounded-lg border p-3 hover:bg-muted/40 transition-colors">
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-medium leading-tight truncate">{event.summary}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.startDateTime).toLocaleString('fr-FR', {
                          weekday: 'short', day: '2-digit', month: 'short',
                          hour: '2-digit', minute: '2-digit',
                        })}
                        {' – '}
                        {new Date(event.endDateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {event.attendees.length > 0 && (
                        <p className="text-xs text-muted-foreground truncate">
                          {event.attendees.map((a) => a.displayName ?? a.email).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                      <a href={event.htmlLink} target="_blank" rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground" title="Ouvrir dans Google Agenda">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handleLinkSlot(event)}>
                        <Link2 className="h-3 w-3" />
                        Associer
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!confirmDeleteRowState} onOpenChange={() => setConfirmDeleteRowState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette ligne ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est définitive. Le suivi du groupe sera supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDeleteRowState) handleDeleteRow(confirmDeleteRowState);
                setConfirmDeleteRowState(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  // --- Handlers pour suppression et archivage ---
  async function handleDeleteRow(row: SuiviRow) {
    setRowLoading(row.id, true);
    try {
      const res = await fetch('/api/code-reviews/suivi', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Ligne supprimée'); await fetchRows(); }
      else toast.error(data.error ?? 'Erreur lors de la suppression');
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setRowLoading(row.id, false);
    }
  }

  async function handleArchiveRow(row: SuiviRow) {
    setRowLoading(row.id, true);
    try {
      const res = await fetch('/api/code-reviews/suivi', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Ligne archivée'); await fetchRows(); }
      else toast.error(data.error ?? 'Erreur lors de l\'archivage');
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setRowLoading(row.id, false);
    }
  }
  // --- Fin handlers ---
}

function FunnelCard({ label, count, color, step }: {
  label: string; count: number;
  color: 'amber' | 'blue' | 'violet' | 'green'; step: number;
}) {
  const colors = {
    amber:  { card: 'border-amber-200 bg-amber-500/5',  num: 'text-amber-700',  label: 'text-amber-600',  step: 'bg-amber-100 text-amber-700' },
    blue:   { card: 'border-blue-200 bg-blue-500/5',    num: 'text-blue-700',   label: 'text-blue-600',   step: 'bg-blue-100 text-blue-700' },
    violet: { card: 'border-violet-200 bg-violet-500/5',num: 'text-violet-700', label: 'text-violet-600', step: 'bg-violet-100 text-violet-700' },
    green:  { card: 'border-green-200 bg-green-500/5',  num: 'text-green-700',  label: 'text-green-600',  step: 'bg-green-100 text-green-700' },
  }[color];
  return (
    <div className={`rounded-lg border p-4 space-y-2 ${colors.card}`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${colors.step}`}>Étape {step}</span>
      </div>
      <p className={`text-3xl font-bold ${colors.num}`}>{count}</p>
      <p className={`text-xs font-medium leading-tight ${colors.label}`}>{label}</p>
    </div>
  );
}
