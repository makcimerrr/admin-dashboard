import { NextResponse } from "next/server";
import { upsertPromoStatus } from "@/lib/db/services/promoStatus";

export async function GET(req: Request) {
  if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Récupère les données de l’API timeline
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/timeline_project`);
    if (!res.ok) {
      console.error("Erreur fetch timeline_project :", res.status, await res.text());
    }
    const promos = await res.json();
    console.log("Promos reçues :", promos);

    // Mets à jour chaque promo dans la DB
    for (const promo of promos) {
      await upsertPromoStatus({
        promoKey: promo.promotionName,
        status: promo.success ? "OK" : "ERROR",
        promotionName: `Promo ${promo.promotionName}`,
        currentProject: promo.currentProject,
        progress: promo.progress,
        agenda: promo.agenda,
        // startDate / endDate : à mapper si dispo
        lastUpdated: new Date(),
      });
    }

    console.log("✅ Cron exécuté et DB mise à jour !");
    return NextResponse.json({ success: true, updated: promos.length });
  } catch (error) {
    console.error("❌ Erreur cron :", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}