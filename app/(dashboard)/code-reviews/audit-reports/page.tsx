'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingCard } from '@/components/ui/loading-card';
import { PILL } from '@/lib/status-pills';
import { cn } from '@/lib/utils';
import { FileText, Send, Check, Loader2, Link2Off } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Auditor {
  login: string;
  hasDiscord: boolean;
  requested: boolean;
  requestedAt: string | null;
  grade: number | null;
}
interface Project {
  groupId: string;
  project: string;
  auditedAt: string | null;
  auditors: Auditor[];
}
interface Promo { key: string; title: string; eventId: number }

export default function AuditReportsPage() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [selectedPromo, setSelectedPromo] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null); // `${login}:${groupId}`

  useEffect(() => {
    fetch('/api/promotions/active')
      .then((r) => r.json())
      .then((d) => { if (d.success) setPromos(d.promotions); })
      .catch(() => {});
  }, []);

  const load = (promo: string) => {
    if (!promo) return;
    setLoading(true);
    fetch(`/api/audit-reports?promo=${encodeURIComponent(promo)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setProjects(d.projects);
        else toast.error(d.error || 'Erreur de chargement.');
      })
      .catch(() => toast.error('Impossible de charger les audits.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (selectedPromo) load(selectedPromo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPromo]);

  const sendRequest = async (p: Project, a: Auditor) => {
    const key = `${a.login}:${p.groupId}`;
    setSending(key);
    try {
      const res = await fetch('/api/audit-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditorLogin: a.login, groupId: p.groupId, project: p.project }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success(`Demande envoyée à ${a.login}`);
        setProjects((prev) =>
          prev.map((proj) =>
            proj.groupId === p.groupId
              ? { ...proj, auditors: proj.auditors.map((au) => au.login === a.login ? { ...au, requested: true, requestedAt: new Date().toISOString() } : au) }
              : proj,
          ),
        );
      } else {
        toast.error(d.error || 'Erreur.');
      }
    } catch {
      toast.error('Erreur réseau.');
    } finally {
      setSending(null);
    }
  };

  const sendAll = async (p: Project) => {
    const targets = p.auditors.filter((a) => a.hasDiscord && !a.requested);
    for (const a of targets) {
      // séquentiel pour ne pas spammer l'API Discord
      // eslint-disable-next-line no-await-in-loop
      await sendRequest(p, a);
    }
  };

  return (
    <div className="page-container flex flex-col gap-4 md:gap-6 p-4 md:p-6">
      <PageHeader
        icon={FileText}
        title="Comptes-rendus d'audit"
        description="Demander aux auditeurs (pairs) un compte-rendu de leurs audits, via Discord."
      />

      <Select value={selectedPromo} onValueChange={setSelectedPromo}>
        <SelectTrigger className="w-full sm:w-[260px]">
          <SelectValue placeholder="Choisir une promotion" />
        </SelectTrigger>
        <SelectContent>
          {promos.map((p) => (
            <SelectItem key={p.key} value={p.key}>{p.title || p.key}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!selectedPromo ? (
        <EmptyState icon={FileText} title="Sélectionnez une promotion" description="Pour voir ses projets audités et leurs auditeurs." />
      ) : loading ? (
        <LoadingCard height="lg" />
      ) : projects.length === 0 ? (
        <EmptyState icon={FileText} title="Aucun projet audité" description="Sur les 60 derniers jours pour cette promo." />
      ) : (
        <div className="grid gap-3">
          {projects.map((p) => {
            const pending = p.auditors.filter((a) => a.hasDiscord && !a.requested).length;
            return (
              <Card key={p.groupId}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <CardTitle className="text-base">{p.project}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {p.auditors.length} auditeur{p.auditors.length > 1 ? 's' : ''}
                        {p.auditedAt && ` · audité ${formatDistanceToNow(new Date(p.auditedAt), { locale: fr, addSuffix: true })}`}
                      </p>
                    </div>
                    {pending > 0 && (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => sendAll(p)}>
                        <Send className="h-3 w-3" />
                        Tout demander ({pending})
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-1.5">
                    {p.auditors.map((a) => {
                      const key = `${a.login}:${p.groupId}`;
                      const busy = sending === key;
                      return (
                        <div key={a.login} className="flex items-center justify-between gap-2 text-sm">
                          <span className="font-mono">{a.login}</span>
                          <div className="flex items-center gap-2">
                            {a.requested ? (
                              <Badge variant="outline" className={cn(PILL.emerald, 'gap-1')}>
                                <Check className="h-3 w-3" />
                                Demandé{a.requestedAt ? ` ${formatDistanceToNow(new Date(a.requestedAt), { locale: fr, addSuffix: true })}` : ''}
                              </Badge>
                            ) : !a.hasDiscord ? (
                              <Badge variant="outline" className={cn(PILL.amber, 'gap-1')}>
                                <Link2Off className="h-3 w-3" />
                                Pas de Discord
                              </Badge>
                            ) : (
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={busy} onClick={() => sendRequest(p, a)}>
                                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                Demander
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
