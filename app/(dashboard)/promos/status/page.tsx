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

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-4xl font-bold">Promotions</h1>

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <div className="space-y-4">
          {promos.map((promo) => (
            <Card
              key={promo.promoKey}
              className="flex flex-col md:flex-row justify-between items-start md:items-center hover:shadow-lg transition-shadow p-4"
            >
              {/* Left side: Promo info */}
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">{promo.promotionName}</h2>
                  <Badge variant={promo.status === "OK" ? "default" : "destructive"}>
                    {promo.status}
                  </Badge>
                </div>
                {promo.currentProject && (
                  <p className="text-sm text-muted-foreground">
                    Projet actuel : <span className="font-medium">{promo.currentProject}</span>
                  </p>
                )}
                {promo.agenda && promo.agenda.length > 0 && (
                  <ul className="list-disc ml-5 text-sm text-muted-foreground">
                    {promo.agenda.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
                <div className="flex space-x-4 text-sm text-muted-foreground mt-1">
                  {promo.startDate && <span>Début : {new Date(promo.startDate).toLocaleDateString()}</span>}
                  {promo.endDate && <span>Fin : {new Date(promo.endDate).toLocaleDateString()}</span>}
                </div>
              </div>

              {/* Right side: Progress bar */}
              {promo.progress !== undefined && (
                <div className="w-full md:w-48 mt-4 md:mt-0 md:ml-6">
                  <p className="text-sm font-medium mb-1">Progression : {promo.progress}%</p>
                  <Progress value={promo.progress} className="h-3 rounded-lg" />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}