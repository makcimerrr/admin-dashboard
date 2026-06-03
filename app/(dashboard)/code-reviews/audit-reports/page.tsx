'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { FileText, Check, Link2Off, Clock } from 'lucide-react';
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

  return (
    <div className="page-container flex flex-col gap-4 md:gap-6 p-4 md:p-6">
      <PageHeader
        icon={FileText}
        title="Comptes-rendus d'audit"
        description="Envoi automatique : quand un projet passe en « finished », ses auditeurs reçoivent un DM Discord. Vue de suivi."
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
          {projects.map((p) => (
            <Card key={p.groupId}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{p.project}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {p.auditors.length} auditeur{p.auditors.length > 1 ? 's' : ''}
                  {p.auditedAt && ` · audité ${formatDistanceToNow(new Date(p.auditedAt), { locale: fr, addSuffix: true })}`}
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-1.5">
                  {p.auditors.map((a) => (
                    <div key={a.login} className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-mono">{a.login}</span>
                      {a.requested ? (
                        <Badge variant="outline" className={cn(PILL.emerald, 'gap-1')}>
                          <Check className="h-3 w-3" />
                          CR demandé{a.requestedAt ? ` ${formatDistanceToNow(new Date(a.requestedAt), { locale: fr, addSuffix: true })}` : ''}
                        </Badge>
                      ) : !a.hasDiscord ? (
                        <Badge variant="outline" className={cn(PILL.amber, 'gap-1')}>
                          <Link2Off className="h-3 w-3" />
                          Pas de Discord
                        </Badge>
                      ) : (
                        <Badge variant="outline" className={cn(PILL.blue, 'gap-1')}>
                          <Clock className="h-3 w-3" />
                          En attente (auto)
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
