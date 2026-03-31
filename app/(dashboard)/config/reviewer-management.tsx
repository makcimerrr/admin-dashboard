'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Loader2, ExternalLink, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface Reviewer {
  id: number;
  name: string;
  planningUrl: string;
  tracks: string[];
  calendarId: string | null;
  eventPrefix: string | null;
  excludedPromos: string[];
  isActive: boolean;
  createdAt: string;
}

interface PromoInfo {
  key: string;
  title: string;
}

const TRACK_COLORS: Record<string, string> = {
  Golang: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
  Javascript: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  Rust: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  Java: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

export default function ReviewerManagement() {
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [promos, setPromos] = useState<PromoInfo[]>([]);
  const [allTracks, setAllTracks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Reviewer | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [planningUrl, setPlanningUrl] = useState('');
  const [tracks, setTracks] = useState<string[]>([]);
  const [calendarId, setCalendarId] = useState('');
  const [eventPrefix, setEventPrefix] = useState('');
  const [excludedPromos, setExcludedPromos] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([fetchReviewers(), fetchPromos(), fetchTracks()]);
  }, []);

  async function fetchReviewers() {
    setLoading(true);
    try {
      const res = await fetch('/api/reviewers?all=true');
      const data = await res.json();
      if (data.success) setReviewers(data.reviewers);
    } catch {
      toast.error('Erreur lors du chargement des reviewers');
    } finally {
      setLoading(false);
    }
  }

  async function fetchTracks() {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      // data is { Golang: [...], Javascript: [...], ... }
      if (data && typeof data === 'object') {
        setAllTracks(Object.keys(data));
      }
    } catch {}
  }

  async function fetchPromos() {
    try {
      const res = await fetch('/api/promotions');
      const data = await res.json();
      if (data.success) setPromos(data.promotions.map((p: any) => ({ key: p.key, title: p.title || p.key })));
    } catch {}
  }

  function openCreate() {
    setEditing(null);
    setName('');
    setPlanningUrl('');
    setTracks([...allTracks]);
    setCalendarId('');
    setEventPrefix('');
    setExcludedPromos([]);
    setDialogOpen(true);
  }

  function openEdit(reviewer: Reviewer) {
    setEditing(reviewer);
    setName(reviewer.name);
    setPlanningUrl(reviewer.planningUrl);
    setTracks(reviewer.tracks);
    setCalendarId(reviewer.calendarId || '');
    setEventPrefix(reviewer.eventPrefix || '');
    setExcludedPromos(reviewer.excludedPromos || []);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim() || !planningUrl.trim()) {
      toast.error('Nom et URL de planning requis');
      return;
    }
    if (tracks.length === 0) {
      toast.error('Sélectionnez au moins un track');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        planningUrl: planningUrl.trim(),
        tracks,
        calendarId: calendarId.trim() || null,
        eventPrefix: eventPrefix.trim() || null,
        excludedPromos,
      };

      const res = editing
        ? await fetch(`/api/reviewers/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch('/api/reviewers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

      const data = await res.json();
      if (data.success) {
        toast.success(editing ? 'Reviewer mis à jour' : 'Reviewer créé');
        setDialogOpen(false);
        fetchReviewers();
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(reviewer: Reviewer) {
    try {
      const res = await fetch(`/api/reviewers/${reviewer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !reviewer.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(reviewer.isActive ? 'Reviewer désactivé' : 'Reviewer activé');
        fetchReviewers();
      }
    } catch {
      toast.error('Erreur');
    }
  }

  async function handleDelete(reviewer: Reviewer) {
    if (!confirm(`Supprimer ${reviewer.name} ?`)) return;
    try {
      const res = await fetch(`/api/reviewers/${reviewer.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Reviewer supprimé');
        fetchReviewers();
      }
    } catch {
      toast.error('Erreur');
    }
  }

  function toggleTrack(track: string) {
    setTracks(prev => prev.includes(track) ? prev.filter(t => t !== track) : [...prev, track]);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Reviewers</h3>
          <p className="text-sm text-muted-foreground">
            Gérez les coachs qui font les code-reviews. Les notifications d'audit sont distribuées automatiquement selon les tracks.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Modifier le reviewer' : 'Nouveau reviewer'}</DialogTitle>
              <DialogDescription>
                {editing ? 'Modifiez les informations du reviewer.' : 'Ajoutez un nouveau coach pour les code-reviews.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nom</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Maxime" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="planningUrl">URL de planning (Google Calendar)</Label>
                <Input id="planningUrl" value={planningUrl} onChange={e => setPlanningUrl(e.target.value)} placeholder="https://calendar.app.google/..." />
              </div>
              <div className="space-y-2">
                <Label>Tracks autorisés</Label>
                <div className="flex flex-wrap gap-2">
                  {allTracks.map(track => (
                    <button
                      key={track}
                      type="button"
                      onClick={() => toggleTrack(track)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        tracks.includes(track)
                          ? TRACK_COLORS[track] + ' border-transparent'
                          : 'bg-muted/30 text-muted-foreground border-border opacity-50'
                      }`}
                    >
                      {track}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="calendarId">Google Calendar ID (optionnel)</Label>
                <Input id="calendarId" value={calendarId} onChange={e => setCalendarId(e.target.value)} placeholder="email@group.calendar.google.com" />
                <p className="text-[11px] text-muted-foreground">
                  Permet d'afficher les créneaux de ce reviewer dans le suivi des audits.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="eventPrefix">Préfixe des événements (optionnel)</Label>
                <Input id="eventPrefix" value={eventPrefix} onChange={e => setEventPrefix(e.target.value)} placeholder='Ex: "Point apprenants", "Code Review"' />
                <p className="text-[11px] text-muted-foreground">
                  Seuls les événements commençant par ce texte seront affichés. Laisser vide = tous les événements.
                </p>
              </div>
              {promos.length > 0 && (
                <div className="space-y-2">
                  <Label>Promotions</Label>
                  <p className="text-[11px] text-muted-foreground">Décochez les promos sur lesquelles ce reviewer ne fait pas de code-reviews.</p>
                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto border rounded-md p-2">
                    {promos.map(promo => {
                      const isExcluded = excludedPromos.includes(promo.key);
                      return (
                        <label key={promo.key} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 rounded px-1.5 py-1">
                          <input
                            type="checkbox"
                            checked={!isExcluded}
                            onChange={() => {
                              setExcludedPromos(prev =>
                                isExcluded ? prev.filter(k => k !== promo.key) : [...prev, promo.key]
                              );
                            }}
                            className="rounded border-border"
                          />
                          <span className={isExcluded ? 'text-muted-foreground line-through' : ''}>{promo.key}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editing ? 'Enregistrer' : 'Créer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {reviewers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Calendar className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">Aucun reviewer configuré</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {reviewers.map(reviewer => (
            <Card key={reviewer.id} className={`transition-opacity ${!reviewer.isActive ? 'opacity-50' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{reviewer.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={reviewer.isActive}
                      onCheckedChange={() => handleToggleActive(reviewer)}
                      className="scale-75"
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(reviewer)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(reviewer)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {reviewer.tracks.map(track => (
                    <Badge key={track} variant="secondary" className={`text-[10px] ${TRACK_COLORS[track] || ''}`}>
                      {track}
                    </Badge>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <a href={reviewer.planningUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground transition-colors">
                    <ExternalLink className="h-3 w-3" />
                    Planning
                  </a>
                  {reviewer.calendarId && (
                    <p className="truncate">Calendar: {reviewer.calendarId}</p>
                  )}
                  {reviewer.excludedPromos.length > 0 && (
                    <p className="text-red-500 dark:text-red-400">
                      Exclu de : {reviewer.excludedPromos.join(', ')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
