"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useData, mutateKey } from "@/lib/client-cache";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingCard } from "@/components/ui/loading-card";
import { PILL } from "@/lib/status-pills";
import { cn } from "@/lib/utils";
import {
  AlarmClock,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  KanbanSquare,
  List,
  MailWarning,
  RefreshCw,
  Search,
  Settings2,
} from "lucide-react";
import {
  MILESTONE_STATUS_LABELS,
  MILESTONE_STATUS_ORDER,
  MILESTONE_STATUS_TONE,
  type ApiEnvelope,
  type FollowUpMilestone,
  type FollowUpStats,
  type MilestoneStatus,
} from "../types";
import { FollowUpDetailDialog } from "./follow-up-detail-dialog";
import { FollowUpSettingsDialog } from "./follow-up-settings-dialog";

const MILESTONES_KEY = "/api/follow-ups?includeClosed=true";
const STATS_KEY = "/api/follow-ups?stats=true";

/** Revalide tout ce que le module affiche après une action. */
export function refreshFollowUps() {
  mutateKey(MILESTONES_KEY);
  mutateKey(STATS_KEY);
}

type PeriodFilter = "all" | "late" | "30" | "90";

/**
 * Suivi en entreprise : les échéances calculées (3 mois, 6 mois, 1 an…) avec
 * leur statut, en liste filtrable ou en Kanban.
 *
 * La logique de relance n'est plus « dans la tête de quelqu'un » : elle est
 * calculée à partir des dates de contrat et rendue visible ici.
 */
export function FollowUpPanel({ onOpenStudent }: { onOpenStudent?: (studentId: number) => void }) {
  const { data: milestonesData, isLoading } = useData<
    ApiEnvelope<{ milestones: FollowUpMilestone[]; count: number }>
  >(MILESTONES_KEY);
  const { data: statsData } = useData<ApiEnvelope<{ stats: FollowUpStats }>>(STATS_KEY);

  const milestones = milestonesData?.success ? milestonesData.data.milestones : [];
  const stats = statsData?.success ? statsData.data.stats : null;

  const [view, setView] = useState<"list" | "kanban">("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MilestoneStatus | "open" | "all">("open");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [selected, setSelected] = useState<FollowUpMilestone | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reconciling, setReconciling] = useState(false);

  const companies = useMemo(
    () => [...new Set(milestones.map((m) => m.companyName))].sort((a, b) => a.localeCompare(b)),
    [milestones],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return milestones.filter((m) => {
      const matchesSearch =
        q === "" ||
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
        m.login.toLowerCase().includes(q) ||
        m.companyName.toLowerCase().includes(q) ||
        (m.tutorName?.toLowerCase().includes(q) ?? false);

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "open"
            ? m.status !== "realise" && m.status !== "annule"
            : m.status === statusFilter;

      const matchesCompany = companyFilter === "all" || m.companyName === companyFilter;

      const matchesPeriod =
        periodFilter === "all"
          ? true
          : periodFilter === "late"
            ? m.daysUntilDue < 0 && m.status !== "realise" && m.status !== "annule"
            : m.daysUntilDue >= 0 && m.daysUntilDue <= Number(periodFilter);

      return matchesSearch && matchesStatus && matchesCompany && matchesPeriod;
    });
  }, [milestones, search, statusFilter, companyFilter, periodFilter]);

  const handleReconcile = async () => {
    setReconciling(true);
    try {
      const res = await fetch("/api/follow-ups/reconcile", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        const { created, updated, cancelled, restored } = json.data;
        toast.success(
          `Échéances recalculées : ${created} créée(s), ${updated} décalée(s), ${cancelled} annulée(s), ${restored} rouverte(s)`,
        );
        refreshFollowUps();
      } else {
        toast.error(json.error?.message ?? "Le recalcul a échoué");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setReconciling(false);
    }
  };

  const formatDue = (m: FollowUpMilestone) => {
    const date = new Date(m.dueDate).toLocaleDateString("fr-FR");
    if (m.status === "realise" || m.status === "annule") return date;
    if (m.daysUntilDue < 0) return `${date} · ${Math.abs(m.daysUntilDue)} j de retard`;
    if (m.daysUntilDue === 0) return `${date} · aujourd'hui`;
    return `${date} · dans ${m.daysUntilDue} j`;
  };

  const rowTone = (m: FollowUpMilestone) =>
    m.daysUntilDue < 0 && m.status !== "realise" && m.status !== "annule"
      ? "text-destructive"
      : "";

  if (isLoading) return <LoadingCard height="lg" />;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Bandeau de pilotage */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <StatCard label="En retard" value={stats?.overdue ?? 0} icon={AlarmClock} accent="var(--destructive)" />
        <StatCard label="À traiter bientôt" value={stats?.dueSoon ?? 0} icon={CalendarClock} />
        <StatCard label="Sans réponse" value={stats?.awaitingReply ?? 0} icon={MailWarning} />
        <StatCard label="RDV planifiés" value={stats?.scheduled ?? 0} icon={CalendarCheck} />
        <StatCard
          label="Suivis réalisés"
          value={stats?.doneThisYear ?? 0}
          hint="depuis le 1er janvier"
          icon={CheckCircle2}
        />
      </div>

      {/* Filtres + actions */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Apprenant, entreprise ou tuteur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as MilestoneStatus | "open" | "all")}
        >
          <SelectTrigger className="w-full lg:w-[190px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">En cours</SelectItem>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {(Object.keys(MILESTONE_STATUS_LABELS) as MilestoneStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {MILESTONE_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="w-full lg:w-[200px]">
            <SelectValue placeholder="Entreprise" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les entreprises</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
          <SelectTrigger className="w-full lg:w-[170px]">
            <SelectValue placeholder="Période" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes périodes</SelectItem>
            <SelectItem value="late">En retard</SelectItem>
            <SelectItem value="30">30 prochains jours</SelectItem>
            <SelectItem value="90">90 prochains jours</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => v && setView(v as "list" | "kanban")}
          >
            <ToggleGroupItem value="list" aria-label="Vue liste">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="kanban" aria-label="Vue Kanban">
              <KanbanSquare className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>

          <Button
            variant="outline"
            size="icon"
            onClick={handleReconcile}
            disabled={reconciling}
            title="Recalculer les échéances à partir des contrats"
          >
            <RefreshCw className={cn("h-4 w-4", reconciling && "animate-spin")} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            title="Configurer les jalons et les relances"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Contenu */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={CalendarClock}
              title="Aucune échéance"
              description={
                milestones.length === 0
                  ? "Les échéances se calculent à partir des dates de contrat. Lancez un recalcul si des contrats viennent d'être ajoutés."
                  : "Aucune échéance ne correspond aux filtres."
              }
            />
          </CardContent>
        </Card>
      ) : view === "list" ? (
        <Card>
          <CardHeader>
            <CardTitle>Échéances de suivi</CardTitle>
            <CardDescription>
              {filtered.length} échéance{filtered.length > 1 ? "s" : ""} — cliquez pour agir
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Apprenant</TableHead>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Tuteur</TableHead>
                    <TableHead>Jalon</TableHead>
                    <TableHead>Échéance</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Relances</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => (
                    <TableRow
                      key={m.id}
                      className="cursor-pointer"
                      onClick={() => setSelected(m)}
                    >
                      <TableCell>
                        <div className="font-medium">
                          {m.firstName} {m.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">{m.promoName}</div>
                      </TableCell>
                      <TableCell>{m.companyName}</TableCell>
                      <TableCell>
                        {m.tutorName ? (
                          <div>
                            <div className="text-sm">{m.tutorName}</div>
                            {!m.tutorEmail && (
                              <div className="text-xs text-warning">email manquant</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-warning">non renseigné</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{m.typeLabel}</Badge>
                      </TableCell>
                      <TableCell className={rowTone(m)}>{formatDue(m)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={PILL[MILESTONE_STATUS_TONE[m.status]]}>
                          {MILESTONE_STATUS_LABELS[m.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {m.reminderCount > 0
                          ? `${m.reminderCount} · ${new Date(m.lastReminderAt!).toLocaleDateString("fr-FR")}`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {MILESTONE_STATUS_ORDER.map((status) => {
            const column = filtered.filter((m) => m.status === status);
            return (
              <Card key={status} className="flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>{MILESTONE_STATUS_LABELS[status]}</span>
                    <Badge variant="outline" className={PILL[MILESTONE_STATUS_TONE[status]]}>
                      {column.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 space-y-2">
                  {column.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Rien ici.</p>
                  ) : (
                    column.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setSelected(m)}
                        className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                      >
                        <div className="font-medium text-sm">
                          {m.firstName} {m.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {m.companyName}
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {m.typeLabel}
                          </Badge>
                          <span className={cn("text-[11px]", rowTone(m))}>
                            {new Date(m.dueDate).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <FollowUpDetailDialog
        milestone={selected}
        onClose={() => setSelected(null)}
        onChanged={refreshFollowUps}
        onOpenStudent={onOpenStudent}
      />

      <FollowUpSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSaved={refreshFollowUps}
      />
    </div>
  );
}
