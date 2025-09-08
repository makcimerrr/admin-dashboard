import { NextResponse } from "next/server";

export async function GET(req: Request) {
  // Vérifie l’en-tête Authorization
  if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Ta logique planifiée ici (ex: nettoyage DB, envoi emails, etc.)
  console.log("✅ Cron exécuté avec succès !");

  return NextResponse.json({ success: true });
}