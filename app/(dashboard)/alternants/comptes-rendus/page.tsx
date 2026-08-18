"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useData } from "@/lib/client-cache";
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
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { ArrowLeft, Building2, CalendarCheck, FileText, Search, Users } from "lucide-react";
import {
  FOLLOW_UP_MODE_LABELS,
  type ApiEnvelope,
  type FollowUpReport,
} from "../types";

const REPORTS_KEY = "/api/follow-ups/reports";

/**
 * Historique complet des comptes rendus de suivi en entreprise.
 *
 * La fiche d'un apprenant ne montre que les siens ; cette page rassemble tout
 * ce qui a été consigné — y compris les suivis repris de Notion (« Suivi
 * entretiens Alternance ») — pour pouvoir chercher par apprenant, par
 * entreprise ou dans le texte des comptes rendus.
 */
export default function ComptesRendusPage() {
  const { data, isLoading } = useData<ApiEnvelope<{ reports: FollowUpReport[]; count: number }>>(
    REPORTS_KEY,
  );
  const reports = data?.success ? data.data.reports : [];

  const [search, setSearch] = useState("");
  const [company, setCompany] = useState("all");
  const [promo, setPromo] = useState("all");
  const [year, setYear] = useState("all");

  const companies = useMemo(
    () =>
      [...new Set(reports.map((r) => r.companyName).filter((c): c is string => Boolean(c)))].sort(
        (a, b) => a.localeCompare(b, "fr"),
      ),
    [reports],
  );
  const promos = useMemo(
    () => [...new Set(reports.map((r) => r.promoName))].sort((a, b) => a.localeCompare(b, "fr")),
    [reports],
  );
  const years = useMemo(
    () =>
      [...new Set(reports.map((r) => new Date(r.performedAt).getFullYear()))].sort(
        (a, b) => b - a,
      ),
    [reports],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter((r) => {
      const matchesSearch =
        q === "" ||
        `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
        r.login.toLowerCase().includes(q) ||
        (r.companyName?.toLowerCase().includes(q) ?? false) ||
        r.content.toLowerCase().includes(q) ||
        (r.vigilancePoints?.toLowerCase().includes(q) ?? false);

      return (
        matchesSearch &&
        (company === "all" || r.companyName === company) &&
        (promo === "all" || r.promoName === promo) &&
        (year === "all" || new Date(r.performedAt).getFullYear() === Number(year))
      );
    });
  }, [reports, search, company, promo, year]);

  const studentsCovered = useMemo(
    () => new Set(filtered.map((r) => r.studentId)).size,
    [filtered],
  );

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return (
    <div className="page-container flex flex-col gap-4 md:gap-6 p-4 md:p-6">
      <PageHeader
        icon={FileText}
        title="Comptes rendus de suivi"
        description="Tout l'historique des entretiens en entreprise, Notion repris compris"
      >
        <Button variant="outline" asChild>
          <Link href="/alternants?tab=suivi">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au suivi
          </Link>
        </Button>
      </PageHeader>

      {isLoading ? (
        <PageSkeleton variant="table" />
      ) : (
        <>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <StatCard label="Comptes rendus" value={filtered.length} icon={FileText} />
            <StatCard label="Apprenants couverts" value={studentsCovered} icon={Users} />
            <StatCard label="Entreprises" value={companies.length} icon={Building2} />
            <StatCard
              label="Dernier suivi"
              value={filtered.length > 0 ? fmt(filtered[0].performedAt) : "—"}
              icon={CalendarCheck}
            />
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Apprenant, entreprise, ou texte du compte rendu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={company} onValueChange={setCompany}>
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

            <Select value={promo} onValueChange={setPromo}>
              <SelectTrigger className="w-full lg:w-[160px]">
                <SelectValue placeholder="Promo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les promos</SelectItem>
                {promos.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-full lg:w-[140px]">
                <SelectValue placeholder="Année" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les années</SelectItem>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <EmptyState
                  icon={FileText}
                  title="Aucun compte rendu"
                  description={
                    reports.length === 0
                      ? "Les comptes rendus apparaissent ici dès qu'un suivi est saisi."
                      : "Aucun compte rendu ne correspond aux filtres."
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Historique</CardTitle>
                <CardDescription>
                  {filtered.length} compte{filtered.length > 1 ? "s" : ""} rendu
                  {filtered.length > 1 ? "s" : ""} — du plus récent au plus ancien
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {filtered.map((r) => (
                  <div key={r.id} className="rounded-lg border p-4 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/alternants?student=${r.studentId}`}
                          className="font-medium hover:underline"
                        >
                          {r.firstName} {r.lastName}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {r.promoName}
                          {r.companyName && ` · ${r.companyName}`}
                          {r.tutorName && ` · ${r.tutorName}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.milestoneLabel && <Badge variant="outline">{r.milestoneLabel}</Badge>}
                        {r.mode && (
                          <Badge variant="outline">
                            {FOLLOW_UP_MODE_LABELS[r.mode] ?? r.mode}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {fmt(r.performedAt)}
                        </span>
                      </div>
                    </div>

                    <p className="whitespace-pre-wrap text-sm">{r.content}</p>

                    {r.vigilancePoints && (
                      <div className="rounded-md border border-warning/30 bg-warning/10 p-2 text-xs">
                        <span className="font-medium">Points de vigilance : </span>
                        {r.vigilancePoints}
                      </div>
                    )}

                    <div className="text-[11px] text-muted-foreground">Par {r.author}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
