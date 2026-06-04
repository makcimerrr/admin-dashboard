"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Briefcase,
  Building2,
  Calendar,
  ChevronRight,
  User,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PILL } from "@/lib/status-pills";
import { type Alternant } from "../types";

export function AlternantsTable({
  filteredAlternants,
  onSelect,
  formatDate,
  isEndingSoon,
}: {
  filteredAlternants: Alternant[];
  onSelect: (alternant: Alternant) => void;
  formatDate: (dateStr: string | null) => string;
  isEndingSoon: (endDate: string | null) => boolean;
}) {
  return (
    <>
      {/* Desktop table */}
      <Table className="hidden md:table">
        <TableHeader>
          <TableRow>
            <TableHead>Étudiant</TableHead>
            <TableHead>Promo</TableHead>
            <TableHead>Entreprise</TableHead>
            <TableHead>Période</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAlternants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="p-0">
                <EmptyState icon={Briefcase} title="Aucun alternant trouvé" />
              </TableCell>
            </TableRow>
          ) : (
            filteredAlternants.map((alt) => (
              <TableRow
                key={alt.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSelect(alt)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {alt.firstName} {alt.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {alt.login}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{alt.promoName}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{alt.companyName || "-"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    {formatDate(alt.alternantStartDate)} -{" "}
                    {formatDate(alt.alternantEndDate)}
                  </div>
                </TableCell>
                <TableCell>
                  {isEndingSoon(alt.alternantEndDate) ? (
                    <Badge variant="outline" className={PILL.orange}>
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Fin proche
                    </Badge>
                  ) : (
                    <Badge variant="outline" className={PILL.emerald}>
                      Actif
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Mobile card stack */}
      <div className="md:hidden">
        {filteredAlternants.length === 0 ? (
          <EmptyState icon={Briefcase} title="Aucun alternant trouvé" />
        ) : (
          <ul className="divide-y">
            {filteredAlternants.map((alt) => (
              <li
                key={alt.id}
                onClick={() => onSelect(alt)}
                className="py-3 cursor-pointer active:bg-muted/50 -mx-6 px-6"
              >
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {alt.firstName} {alt.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {alt.login}
                        </div>
                      </div>
                      {isEndingSoon(alt.alternantEndDate) ? (
                        <Badge variant="outline" className={`${PILL.orange} shrink-0`}>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Fin proche
                        </Badge>
                      ) : (
                        <Badge variant="outline" className={`${PILL.emerald} shrink-0`}>
                          Actif
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Badge variant="outline" className="font-normal">
                          {alt.promoName}
                        </Badge>
                      </span>
                      {alt.companyName && (
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {alt.companyName}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(alt.alternantStartDate)} – {formatDate(alt.alternantEndDate)}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
