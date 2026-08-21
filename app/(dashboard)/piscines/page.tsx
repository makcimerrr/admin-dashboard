"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { PILL } from "@/lib/status-pills";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Users,
  Waves,
  XCircle,
} from "lucide-react";
import { CandidateSheet } from "./_components/candidate-sheet";
import {
  ADMISSION_LABELS,
  ADMISSION_TONE,
  candidateName,
  matchesAllWords,
  type AdmissionStatus,
  type ApiEnvelope,
  type CandidateMatch,
  type PiscineCandidate,
  type PiscineSession,
  type PiscineStats,
} from "./types";

const SESSIONS_KEY = "/api/piscines";

/**
 * Piscines de sélection — suivi des CANDIDATS (pas des apprenants).
 *
 * Il y a une session par vague de recrutement : le sélecteur de session est
 * l'entrée du module, tout le reste en découle. Par défaut on ouvre la plus
 * récente, celle qu'on a le plus de chances de vouloir regarder.
 */
export default function PiscinesPage() {
  const { data: sessionsData, isLoading } = useData<ApiEnvelope<{ sessions: PiscineSession[] }>>(
    SESSIONS_KEY,
  );
  const sessions = sessionsData?.success ? sessionsData.data.sessions : [];

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [admissionFilter, setAdmissionFilter] = useState<AdmissionStatus | "all" | "risk">("all");
  const [selected, setSelected] = useState<PiscineCandidate | null>(null);
  const [syncing, setSyncing] = useState(false);
  /** Candidat mis en évidence après une recherche (id), et sa ligne. */
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const [matches, setMatches] = useState<CandidateMatch[]>([]);
  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());

  // Ouvre la session la plus récente dès que la liste arrive.
  useEffect(() => {
    if (sessionId === null && sessions.length > 0) setSessionId(sessions[0].eventId);
  }, [sessions, sessionId]);

  const detailKey = sessionId ? `/api/piscines/${sessionId}` : null;
  const { data: detailData, isLoading: loadingDetail } = useData<
    ApiEnvelope<{ candidates: PiscineCandidate[]; stats: PiscineStats; exams: string[] }>
  >(detailKey);

  const candidates = detailData?.success ? detailData.data.candidates : [];
  const stats = detailData?.success ? detailData.data.stats : null;
  // Une colonne par examen de la session, dans l'ordre où ils ont eu lieu.
  // Les sessions n'ont pas toutes les mêmes épreuves : rien n'est codé en dur.
  const exams = detailData?.success ? detailData.data.exams : [];
  const session = sessions.find((s) => s.eventId === sessionId) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim();
    return candidates.filter((c) => {
      // Tous les mots doivent être présents, dans n'importe quel ordre :
      // « Maxime Dubois » et « Dubois Maxime » trouvent la même personne.
      const matchesSearch =
        q === "" ||
        matchesAllWords(`${c.firstName ?? ""} ${c.lastName ?? ""} ${c.login} ${c.email ?? ""}`, q);

      const matchesAdmission =
        admissionFilter === "all"
          ? true
          : admissionFilter === "risk"
            ? c.risk !== null
            : c.admission === admissionFilter;

      return matchesSearch && matchesAdmission;
    });
  }, [candidates, search, admissionFilter]);

  /**
   * Recherche transversale : un candidat peut être dans n'importe quelle
   * session, et on ne sait pas forcément laquelle. On interroge donc toutes
   * les sessions dès que la requête est un peu spécifique.
   */
  useEffect(() => {
    const q = search.trim();
    if (q.length < 3) {
      setMatches([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/piscines/search?q=${encodeURIComponent(q)}`);
      const json = (await res.json()) as ApiEnvelope<{ matches: CandidateMatch[] }>;
      if (json.success) setMatches(json.data.matches);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  /**
   * Ouvre un candidat trouvé par la recherche : bascule sur SA session, vide
   * le filtre pour montrer toute la promo, et met sa ligne en évidence.
   */
  const goToCandidate = (m: CandidateMatch) => {
    setSessionId(m.sessionEventId);
    setSearch("");
    setAdmissionFilter("all");
    setMatches([]);
    setHighlighted(m.id);
  };

  // Fait défiler jusqu'à la ligne mise en évidence, une fois la session chargée.
  useEffect(() => {
    if (highlighted === null) return;
    const row = rowRefs.current.get(highlighted);
    if (row) row.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlighted, candidates]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/piscines/sync", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast.success(
          `${json.data.sessions} session(s), ${json.data.candidates} candidat(s) synchronisé(s)`,
        );
        mutateKey(SESSIONS_KEY);
        if (detailKey) mutateKey(detailKey);
      } else {
        toast.error(json.error?.message ?? "La synchronisation a échoué");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSyncing(false);
    }
  };

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("fr-FR") : "—";

  return (
    <div className="page-container flex flex-col gap-4 md:gap-6 p-4 md:p-6">
      <PageHeader
        icon={Waves}
        title="Piscines de sélection"
        description="Suivi des candidats en piscine-go — données synchronisées depuis la plateforme"
      >
        <Button variant="outline" onClick={handleSync} disabled={syncing}>
          <RefreshCw className={cn("mr-2 h-4 w-4", syncing && "animate-spin")} />
          Synchroniser
        </Button>
      </PageHeader>

      {isLoading ? (
        <PageSkeleton variant="table" />
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Waves}
              title="Aucune session"
              description="Lancez une synchronisation pour récupérer les piscines depuis la plateforme."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Le choix de la session commande tout le reste de la page. */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Select
              value={sessionId ? String(sessionId) : undefined}
              onValueChange={(v) => {
                setSessionId(Number(v));
                setSelected(null);
                setHighlighted(null);
              }}
            >
              <SelectTrigger className="w-full lg:w-[340px]">
                <SelectValue placeholder="Choisir une session" />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((s) => (
                  <SelectItem key={s.eventId} value={String(s.eventId)}>
                    {s.label}
                    {s.isRetry ? "" : ""} — {s.candidatesCount} candidat
                    {s.candidatesCount > 1 ? "s" : ""}
                    {s.admittedCount > 0 ? `, ${s.admittedCount} admis` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {session && (
              <p className="text-xs text-muted-foreground">
                du {fmtDate(session.startAt)} au {fmtDate(session.endAt)}
                {session.syncedAt && ` · synchronisé le ${fmtDate(session.syncedAt)}`}
              </p>
            )}
          </div>

          {loadingDetail ? (
            <PageSkeleton variant="table" />
          ) : (
            <>
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
                <StatCard label="Candidats" value={stats?.candidates ?? 0} icon={Users} />
                <StatCard
                  label="Admis"
                  value={stats?.admitted ?? 0}
                  icon={CheckCircle2}
                  accent="var(--success)"
                />
                <StatCard label="Refusés" value={stats?.refused ?? 0} icon={XCircle} />
                <StatCard
                  label="En difficulté"
                  value={stats?.atRisk ?? 0}
                  icon={AlertTriangle}
                  accent="var(--warning)"
                />
                <StatCard
                  label="Moyenne absolue"
                  value={
                    stats?.averageExam !== null && stats
                      ? `${Math.round(stats.averageExam! * 100)} %`
                      : "—"
                  }
                  hint="exercices réussis / barème"
                />
              </div>

              <div className="flex flex-col gap-3 lg:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nom, login ou email — « Maxime Dubois » ou « Dubois Maxime »"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />

                  {/* Résultats des AUTRES sessions : c'est ce qui permet de
                      retrouver quelqu'un sans savoir dans quelle piscine il
                      était. */}
                  {matches.filter((m) => m.sessionEventId !== sessionId).length > 0 && (
                    <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-md">
                      <p className="border-b px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                        Trouvé dans d&apos;autres sessions
                      </p>
                      {matches
                        .filter((m) => m.sessionEventId !== sessionId)
                        .slice(0, 6)
                        .map((m) => (
                          <button
                            key={m.id}
                            onClick={() => goToCandidate(m)}
                            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
                          >
                            <span>
                              <span className="font-medium">{candidateName(m)}</span>
                              <span className="ml-2 text-xs text-muted-foreground">
                                {m.login}
                              </span>
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {m.sessionLabel}
                            </span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
                <Select
                  value={admissionFilter}
                  onValueChange={(v) => setAdmissionFilter(v as AdmissionStatus | "all" | "risk")}
                >
                  <SelectTrigger className="w-full lg:w-[220px]">
                    <SelectValue placeholder="Décision" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les candidats</SelectItem>
                    <SelectItem value="risk">En difficulté</SelectItem>
                    <SelectItem value="admis">Admis</SelectItem>
                    <SelectItem value="refuse">Refusés</SelectItem>
                    <SelectItem value="en_cours">Décision en attente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filtered.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <EmptyState
                      icon={Users}
                      title="Aucun candidat"
                      description={
                        candidates.length === 0
                          ? "Cette session n'a aucun candidat synchronisé."
                          : "Aucun candidat ne correspond aux filtres."
                      }
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Candidats</CardTitle>
                    <CardDescription>
                      {filtered.length} candidat{filtered.length > 1 ? "s" : ""} — note =
                      exercices réussis pendant l&apos;épreuve, sur son barème. Cliquez pour
                      voir le détail.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Candidat</TableHead>
                            <TableHead className="text-right">Niveau</TableHead>
                            <TableHead className="text-right">Exercices</TableHead>
                            {exams.map((name) => (
                              <TableHead key={name} className="text-right whitespace-nowrap">
                                {name}
                              </TableHead>
                            ))}
                            <TableHead className="text-right whitespace-nowrap">
                              Total
                            </TableHead>
                            <TableHead>Dernière activité</TableHead>
                            <TableHead>Décision</TableHead>
                            <TableHead>Alerte</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.map((c) => (
                            <TableRow
                              key={c.id}
                              ref={(el) => {
                                if (el) rowRefs.current.set(c.id, el);
                                else rowRefs.current.delete(c.id);
                              }}
                              className={cn(
                                "cursor-pointer",
                                // Surbrillance persistante : on vient d'arriver
                                // ici en cherchant cette personne précisément.
                                highlighted === c.id && "bg-primary/10 ring-1 ring-primary/40",
                              )}
                              onClick={() => setSelected(c)}
                            >
                              <TableCell>
                                <div className="font-medium">{candidateName(c)}</div>
                                <div className="text-xs text-muted-foreground">{c.login}</div>
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {c.level ?? "—"}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {c.exercisesDone}
                                <span className="text-muted-foreground">/{c.exercisesTried}</span>
                              </TableCell>
                              {exams.map((name) => {
                                const sc = c.examScores[name];
                                return (
                                  <TableCell
                                    key={name}
                                    className={cn(
                                      "text-right tabular-nums",
                                      // Un examen non passé n'est pas un zéro :
                                      // la nuance compte pour lire un parcours.
                                      !sc
                                        ? "text-muted-foreground"
                                        : sc.passed === 0
                                          ? "text-destructive"
                                          : sc.passed >= sc.max / 2
                                            ? "text-success"
                                            : "text-warning",
                                    )}
                                    title={sc ? undefined : "Examen non passé"}
                                  >
                                    {sc ? `${sc.passed}/${sc.max}` : "—"}
                                  </TableCell>
                                );
                              })}
                              <TableCell className="text-right tabular-nums font-medium">
                                {c.examPassed !== null && c.examTotal ? (
                                  <>
                                    {c.examPassed}/{c.examTotal}
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      {Math.round((c.examAverage ?? 0) * 100)} %
                                    </span>
                                  </>
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                              <TableCell className="text-sm">
                                {fmtDate(c.lastActivityAt)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={PILL[ADMISSION_TONE[c.admission]]}
                                >
                                  {ADMISSION_LABELS[c.admission]}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {c.risk ? (
                                  <span className="text-xs text-warning">{c.risk}</span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}

      <CandidateSheet candidate={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
