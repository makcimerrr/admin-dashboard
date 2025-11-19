"use client";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar, Loader2, TrendingUp, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Promo = {
  promoKey: string;
  promotionName: string;
  currentProject?: string | null;
  progress?: number;
  agenda?: string[];
  status: string;
  startDate?: string | null;
  endDate?: string | null;
};

export default function PromosPage() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/promos/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setPromos(data.promos);
      })
      .finally(() => setLoading(false));
  }, []);

  const okPromos = promos.filter(p => p.status === "OK");
  const issuePromos = promos.filter(p => p.status !== "OK");
  const avgProgress = promos.length > 0
    ? Math.round(promos.reduce((acc, p) => acc + (p.progress || 0), 0) / promos.length)
    : 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Calendar className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Statut des promotions</h1>
          <p className="text-muted-foreground">
            Suivez l'avancement et le statut de chaque promotion en temps réel
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Promotions</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{promos.length}</div>
                <p className="text-xs text-muted-foreground">Promotions actives</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">En bonne santé</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{okPromos.length}</div>
                <p className="text-xs text-muted-foreground">Statut OK</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Nécessite attention</CardTitle>
                <AlertCircle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{issuePromos.length}</div>
                <p className="text-xs text-muted-foreground">Problèmes détectés</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Progression Moyenne</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgProgress}%</div>
                <p className="text-xs text-muted-foreground">Toutes promotions</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for filtering */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">Toutes ({promos.length})</TabsTrigger>
              <TabsTrigger value="ok">En santé ({okPromos.length})</TabsTrigger>
              <TabsTrigger value="issues">Attention ({issuePromos.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4 mt-4">
              {promos.map((promo) => (
                <PromoCard key={promo.promoKey} promo={promo} />
              ))}
            </TabsContent>

            <TabsContent value="ok" className="space-y-4 mt-4">
              {okPromos.length > 0 ? (
                okPromos.map((promo) => (
                  <PromoCard key={promo.promoKey} promo={promo} />
                ))
              ) : (
                <Card>
                  <CardContent className="p-12 text-center text-muted-foreground">
                    Aucune promotion avec statut OK
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="issues" className="space-y-4 mt-4">
              {issuePromos.length > 0 ? (
                issuePromos.map((promo) => (
                  <PromoCard key={promo.promoKey} promo={promo} />
                ))
              ) : (
                <Card>
                  <CardContent className="p-12 text-center text-muted-foreground">
                    Aucune promotion nécessitant une attention
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function PromoCard({ promo }: { promo: Promo }) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">{promo.promotionName}</CardTitle>
            {promo.currentProject && (
              <CardDescription className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                Projet actuel : <span className="font-medium text-foreground">{promo.currentProject}</span>
              </CardDescription>
            )}
          </div>
          <Badge variant={promo.status === "OK" ? "default" : "destructive"}>
            {promo.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress */}
        {promo.progress !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progression</span>
              <span className="font-bold">{promo.progress}%</span>
            </div>
            <Progress value={promo.progress} className="h-2" />
          </div>
        )}

        {/* Dates */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {promo.startDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Début : {new Date(promo.startDate).toLocaleDateString('fr-FR')}</span>
            </div>
          )}
          {promo.endDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Fin : {new Date(promo.endDate).toLocaleDateString('fr-FR')}</span>
            </div>
          )}
        </div>

        {/* Agenda */}
        {promo.agenda && promo.agenda.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Agenda :</p>
            <ul className="space-y-1">
              {promo.agenda.map((item, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}