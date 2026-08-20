import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PILL } from '@/lib/status-pills';
import { cn } from '@/lib/utils';
import { ArrowRight, Briefcase, MailWarning } from 'lucide-react';
import {
  getFollowUpStats,
  getMilestonesToRemind,
  type MilestoneRow,
} from '@/lib/db/services/followUps';

/**
 * Vision rapide du suivi en entreprise sur l'accueil.
 *
 * Ce widget répond à une seule question : « qu'est-ce que j'ai à traiter ? ».
 * Il montre donc en premier les relances à confirmer — celles qui attendent un
 * geste humain — et non la liste des retards, dont le plus ancien remonte à
 * 2023 et n'appelle plus d'action.
 *
 * Rendu uniquement dans la branche admin de l'accueil : les données (contacts
 * d'entreprises) ne sont pas visibles des apprenants.
 */
export async function FollowUpWidget() {
  const [stats, toRemind] = await Promise.all([getFollowUpStats(), getMilestonesToRemind()]);

  const total = stats.overdue + stats.dueSoon + stats.awaitingReply + stats.scheduled;
  // Rien de calculé, rien à afficher : inutile d'occuper l'accueil.
  if (total === 0 && stats.doneThisYear === 0) return null;

  const actionable = toRemind.filter((m) => m.tutorEmail);
  const blocked = toRemind.filter((m) => !m.tutorEmail);

  const dueLabel = (m: MilestoneRow) => {
    const date = new Date(m.dueDate).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
    if (m.daysUntilDue < 0) return `${date} · ${Math.abs(m.daysUntilDue)} j de retard`;
    if (m.daysUntilDue === 0) return `${date} · aujourd'hui`;
    return `${date} · dans ${m.daysUntilDue} j`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Briefcase className="h-4 w-4 text-primary" />
          Suivi en entreprise
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/alternants?tab=suivi">
            Ouvrir
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Repères chiffrés, chacun ouvrant la vue filtrée correspondante */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: 'En retard', value: stats.overdue, tone: 'rose' as const },
            { label: 'À traiter bientôt', value: stats.dueSoon, tone: 'amber' as const },
            { label: 'Sans réponse', value: stats.awaitingReply, tone: 'amber' as const },
            { label: 'RDV planifiés', value: stats.scheduled, tone: 'violet' as const },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-lg border p-3">
              <div
                className={cn(
                  'text-2xl font-bold leading-none tabular-nums',
                  kpi.value > 0 && kpi.tone === 'rose' && 'text-destructive',
                )}
              >
                {kpi.value}
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                {kpi.label}
              </div>
            </div>
          ))}
        </div>

        {/* Ce qui attend une décision */}
        {actionable.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune relance en attente de confirmation.
            {stats.doneThisYear > 0 && ` ${stats.doneThisYear} suivis réalisés cette année.`}
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <h4 className="text-sm font-medium">
                {actionable.length} relance{actionable.length > 1 ? 's' : ''} à confirmer
              </h4>
              <span className="text-[11px] text-muted-foreground">
à envoyer depuis votre messagerie
              </span>
            </div>

            <ul className="divide-y rounded-lg border">
              {actionable.slice(0, 5).map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/alternants?tab=suivi&milestone=${m.id}`}
                    className="flex items-center justify-between gap-3 p-3 text-sm transition-colors hover:bg-muted/50"
                  >
                    <span className="min-w-0">
                      <span className="font-medium">
                        {m.firstName} {m.lastName}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {m.companyName} · {m.typeLabel}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'shrink-0 text-xs tabular-nums',
                        m.daysUntilDue < 0 ? 'text-destructive' : 'text-muted-foreground',
                      )}
                    >
                      {dueLabel(m)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            {actionable.length > 5 && (
              <p className="text-xs text-muted-foreground">
                …et {actionable.length - 5} autre{actionable.length - 5 > 1 ? 's' : ''}.
              </p>
            )}
          </div>
        )}

        {/* Sans email de tuteur, aucune relance n'est possible : c'est une
            action différente — compléter la fiche, pas envoyer un mail. */}
        {blocked.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs">
            <MailWarning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <span>
              <Badge variant="outline" className={PILL.amber}>
                {blocked.length}
              </Badge>{' '}
              échéance{blocked.length > 1 ? 's' : ''} sans email de tuteur — la relance est
              impossible tant que le contact entreprise n'est pas renseigné.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
