"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Briefcase, Building2, Clock, Users } from "lucide-react";
import { type AlternantStats } from "../page";

export function AlternantsStats({
  stats,
  companiesCount,
}: {
  stats: AlternantStats | null;
  companiesCount: number;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="hover:shadow-sm transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Alternants
          </CardTitle>
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats?.total || 0}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Étudiants en alternance
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-sm transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Contrats Actifs
          </CardTitle>
          <div className="p-2 bg-success/10 rounded-lg">
            <Briefcase className="h-4 w-4 text-success" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-success">
            {stats?.activeContracts || 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            En cours actuellement
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-sm transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Fin Prochaine
          </CardTitle>
          <div className="p-2 bg-warning/10 rounded-lg">
            <Clock className="h-4 w-4 text-warning" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-warning">
            {stats?.endingSoon || 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Dans les 30 prochains jours
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-sm transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Entreprises
          </CardTitle>
          <div className="p-2 bg-primary/10 rounded-lg">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{companiesCount}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Partenaires différents
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
