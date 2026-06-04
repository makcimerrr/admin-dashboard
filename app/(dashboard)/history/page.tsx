import { getEnrichedHistory } from "@/lib/db/services/history";
import HistoryClient from "./_components/history-client";

// Server Component : charge l'historique initial côté serveur (même fonction
// de service que la route /api/history, avec limit=100 et sans filtre) et le
// passe en props à l'îlot client. Plus de fetch au montage → pas de loader.
// Le gate de permission (useUser) et le re-fetch sur filtre restent côté client.
export default async function HistoryPage() {
  const rows = await getEnrichedHistory({ limit: 100 });
  // On sérialise comme le ferait la route API (date -> ISO string) pour que la
  // forme des données soit identique à celle déjà consommée par le client.
  const initialHistory = rows.map((entry) => ({
    ...entry,
    date: entry.date instanceof Date ? entry.date.toISOString() : (entry.date as unknown as string),
  }));

  return <HistoryClient initialHistory={initialHistory} />;
}
