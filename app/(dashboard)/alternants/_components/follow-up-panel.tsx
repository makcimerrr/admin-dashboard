"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  KanbanSquare,
  Layers,
  List,
  MailWarning,
  RefreshCw,
  Search,
  Settings2,
} from "lucide-react";
import {
  KANBAN_COLUMNS,
  MILESTONE_STATUS_LABELS,
  displayStatus,
  milestoneColumnIndex,
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

type SortKey =
  | "student"
  | "company"
  | "tutor"
  | "milestone"
  | "dueDate"
  | "lastReport"
  | "status"
  | "reminders";

/** Comparateurs par colonne ; le sens (asc/desc) est appliqué par l'appelant. */
const SORTERS: Record<SortKey, (a: FollowUpMilestone, b: FollowUpMilestone) => number> = {
  student: (a, b) =>
    `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "fr"),
  company: (a, b) => a.companyName.localeCompare(b.companyName, "fr"),
  // Les lignes sans email de tuteur remontent : ce sont celles à compléter.
  tutor: (a, b) =>
    Number(Boolean(a.tutorEmail)) - Number(Boolean(b.tutorEmail)) ||
    (a.tutorName ?? "").localeCompare(b.tutorName ?? "", "fr"),
  // Par ancienneté du jalon (3 mois < 6 mois < 1 an), pas par ordre alphabétique.
  milestone: (a, b) =>
    new Date(a.dueDate).getTime() -
      new Date(a.contractStart).getTime() -
      (new Date(b.dueDate).getTime() - new Date(b.contractStart).getTime()),
  dueDate: (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  // Jamais rencontré = cas le plus criant : ces lignes remontent en tête.
  lastReport: (a, b) =>
    (a.lastReportAt ? new Date(a.lastReportAt).getTime() : 0) -
    (b.lastReportAt ? new Date(b.lastReportAt).getTime() : 0),
  // Même ordre que les colonnes du Kanban : « en retard » d'abord.
  status: (a, b) => milestoneColumnIndex(a) - milestoneColumnIndex(b),
  reminders: (a, b) => a.reminderCount - b.reminderCount,
};

type KpiKey = "overdue" | "dueSoon" | "awaitingReply" | "scheduled" | "done";

/** Filtres posés par un clic sur chaque KPI du bandeau. */
const KPI_FILTERS: Record<
  KpiKey,
  { status: MilestoneStatus | "open" | "all"; period: PeriodFilter }
> = {
  overdue: { status: "open", period: "late" },
  dueSoon: { status: "open", period: "30" },
  awaitingReply: { status: "relance_envoyee", period: "all" },
  scheduled: { status: "rdv_planifie", period: "all" },
  done: { status: "realise", period: "all" },
};

/** En-tête de colonne cliquable, avec l'indicateur du sens de tri. */
function SortableHead({
  sortKey,
  sort,
  onSort,
  align = "left",
  children,
}: {
  sortKey: SortKey;
  sort: { key: SortKey; dir: "asc" | "desc" };
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  const active = sort.key === sortKey;
  return (
    <TableHead className={align === "right" ? "text-right" : undefined}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground transition-colors",
          align === "right" && "flex-row-reverse",
          active ? "text-foreground font-medium" : "text-muted-foreground",
        )}
      >
        {children}
        {active ? (
          sort.dir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

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
  // Un contrat porte plusieurs jalons : les afficher tous produit des lignes
  // quasi identiques pour un même apprenant, ce qui se lit comme des doublons.
  // Par défaut on ne montre que l'échéance la plus urgente de chaque contrat.
  const [oneRowPerStudent, setOneRowPerStudent] = useState(true);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "dueDate",
    dir: "asc",
  });
  /** KPI sélectionné : pilote les filtres, et se désélectionne au 2e clic. */
  const [activeKpi, setActiveKpi] = useState<KpiKey | null>(null);
  const [selected, setSelected] = useState<FollowUpMilestone | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deepLinked, setDeepLinked] = useState(false);
  const [reconciling, setReconciling] = useState(false);

  // Lien profond depuis le widget d'accueil : ?milestone=<id> ouvre
  // directement l'échéance, pour passer du constat à l'action en un clic.
  const searchParams = useSearchParams();
  const requestedMilestone = searchParams.get("milestone");

  useEffect(() => {
    if (deepLinked || !requestedMilestone || milestones.length === 0) return;
    const target = milestones.find((m) => m.id === Number(requestedMilestone));
    if (target) setSelected(target);
    setDeepLinked(true);
  }, [deepLinked, requestedMilestone, milestones]);

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

  /**
   * Réduit à une ligne par contrat. On garde le jalon le PLUS AVANCÉ (18 mois
   * plutôt que 3 mois) : c'est là qu'en est réellement le suivi. Afficher le
   * plus ancien donnait « 3 mois + 4 autres », qui se lit comme un doublon et
   * masque l'état courant.
   */
  const grouped = useMemo(() => {
    if (!oneRowPerStudent) {
      return filtered.map((m) => ({ milestone: m, others: 0 }));
    }
    const byContract = new Map<number, FollowUpMilestone[]>();
    for (const m of filtered) {
      const list = byContract.get(m.contractId) ?? [];
      list.push(m);
      byContract.set(m.contractId, list);
    }
    // `filtered` arrive trié par échéance croissante : le dernier du groupe est
    // le jalon le plus avancé.
    return [...byContract.values()].map((list) => ({
      milestone: list[list.length - 1],
      others: list.length - 1,
    }));
  }, [filtered, oneRowPerStudent]);

  const displayed = useMemo(() => {
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...grouped].sort(
      (a, b) => factor * SORTERS[sort.key](a.milestone, b.milestone),
    );
  }, [grouped, sort]);

  /** Anneau sur la carte dont le filtre est actif. */
  const kpiRing = (kpi: KpiKey) =>
    activeKpi === kpi ? "ring-2 ring-primary border-primary" : undefined;

  const toggleSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "dueDate" ? "asc" : "asc" },
    );

  /**
   * Un clic sur un KPI positionne les filtres correspondants ; un second clic
   * sur le même KPI les relâche.
   */
  const applyKpi = (kpi: KpiKey) => {
    if (activeKpi === kpi) {
      setActiveKpi(null);
      setStatusFilter("open");
      setPeriodFilter("all");
      return;
    }
    setActiveKpi(kpi);
    setStatusFilter(KPI_FILTERS[kpi].status);
    setPeriodFilter(KPI_FILTERS[kpi].period);
  };

  const handleReconcile = async () => {
    setReconciling(true);
    try {
      const res = await fetch("/api/follow-ups/reconcile", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        const { created, updated, cancelled, restored, linkedReports } = json.data;
        toast.success(
          `Échéances recalculées : ${created} créée(s), ${updated} décalée(s), ` +
            `${cancelled} annulée(s), ${restored} rouverte(s)` +
            (linkedReports?.linked
              ? ` — ${linkedReports.linked} compte(s) rendu(s) rattaché(s)`
              : ""),
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

  /** Ancienneté lisible : « il y a 8 mois » parle plus qu'une date seule. */
  const monthsAgo = (iso: string) => {
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
    if (days < 31) return `il y a ${days} j`;
    const months = Math.round(days / 30.44);
    if (months < 12) return `il y a ${months} mois`;
    const years = Math.floor(months / 12);
    const rest = months % 12;
    return rest === 0 ? `il y a ${years} an${years > 1 ? "s" : ""}` : `il y a ${years} an${years > 1 ? "s" : ""} ${rest} m`;
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
        <StatCard
          label="En retard"
          value={stats?.overdue ?? 0}
          icon={AlarmClock}
          accent="var(--destructive)"
          onClick={() => applyKpi("overdue")}
          className={kpiRing("overdue")}
        />
        <StatCard
          label="À traiter bientôt"
          value={stats?.dueSoon ?? 0}
          icon={CalendarClock}
          onClick={() => applyKpi("dueSoon")}
          className={kpiRing("dueSoon")}
        />
        <StatCard
          label="Sans réponse"
          value={stats?.awaitingReply ?? 0}
          icon={MailWarning}
          onClick={() => applyKpi("awaitingReply")}
          className={kpiRing("awaitingReply")}
        />
        <StatCard
          label="RDV planifiés"
          value={stats?.scheduled ?? 0}
          icon={CalendarCheck}
          onClick={() => applyKpi("scheduled")}
          className={kpiRing("scheduled")}
        />
        <StatCard
          label="Suivis réalisés"
          value={stats?.doneThisYear ?? 0}
          hint="depuis le 1er janvier"
          icon={CheckCircle2}
          onClick={() => applyKpi("done")}
          className={kpiRing("done")}
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
            variant={oneRowPerStudent ? "default" : "outline"}
            size="icon"
            onClick={() => setOneRowPerStudent((v) => !v)}
            title={
              oneRowPerStudent
                ? "Une ligne par apprenant (échéance la plus urgente) — cliquer pour tout voir"
                : "Toutes les échéances — cliquer pour n'afficher que la plus urgente par apprenant"
            }
          >
            <Layers className="h-4 w-4" />
          </Button>
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
              {oneRowPerStudent
                ? `${displayed.length} apprenant${displayed.length > 1 ? "s" : ""} à suivre sur ${filtered.length} échéance${filtered.length > 1 ? "s" : ""}`
                : `${filtered.length} échéance${filtered.length > 1 ? "s" : ""}`}{" "}
              — cliquez pour agir
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead sortKey="student" sort={sort} onSort={toggleSort}>
                      Apprenant
                    </SortableHead>
                    <SortableHead sortKey="company" sort={sort} onSort={toggleSort}>
                      Entreprise
                    </SortableHead>
                    <SortableHead sortKey="tutor" sort={sort} onSort={toggleSort}>
                      Tuteur
                    </SortableHead>
                    <SortableHead sortKey="milestone" sort={sort} onSort={toggleSort}>
                      Jalon
                    </SortableHead>
                    <SortableHead sortKey="dueDate" sort={sort} onSort={toggleSort}>
                      Échéance
                    </SortableHead>
                    <SortableHead sortKey="lastReport" sort={sort} onSort={toggleSort}>
                      Dernier RDV
                    </SortableHead>
                    <SortableHead sortKey="status" sort={sort} onSort={toggleSort}>
                      Statut
                    </SortableHead>
                    <SortableHead sortKey="reminders" sort={sort} onSort={toggleSort} align="right">
                      Relances
                    </SortableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayed.map(({ milestone: m, others }) => (
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
                        {/* Le nom du tuteur entreprise n'existe dans aucune de
                            nos sources : l'email EST l'identité du contact. */}
                        {m.tutorName ? (
                          <div>
                            <div className="text-sm">{m.tutorName}</div>
                            {m.tutorEmail && (
                              <div className="text-xs text-muted-foreground">{m.tutorEmail}</div>
                            )}
                          </div>
                        ) : m.tutorEmail ? (
                          <span className="text-sm">{m.tutorEmail}</span>
                        ) : (
                          <span className="text-xs text-warning">aucun contact</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          title={
                            others > 0
                              ? `Jalon le plus avancé ; ${others} autre${others > 1 ? "s" : ""} échéance${others > 1 ? "s" : ""} ouverte${others > 1 ? "s" : ""} sur ce contrat`
                              : undefined
                          }
                        >
                          {m.typeLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className={rowTone(m)}>{formatDue(m)}</TableCell>
                      <TableCell>
                        {m.lastReportAt ? (
                          <div title={m.lastReportTitle ?? undefined}>
                            <div className="text-sm">
                              {new Date(m.lastReportAt).toLocaleDateString("fr-FR")}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {monthsAgo(m.lastReportAt)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-warning">jamais rencontré</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={PILL[displayStatus(m).tone]}
                        >
                          {displayStatus(m).label}
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {KANBAN_COLUMNS.map(({ key, label, tone, match }) => {
            const column = filtered.filter(match);
            return (
              <Card key={key} className="flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>{label}</span>
                    <Badge variant="outline" className={PILL[tone]}>
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
