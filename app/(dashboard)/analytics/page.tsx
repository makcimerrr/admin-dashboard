import { getActivePromotions } from '@/lib/config/promotions';
import AnalyticsClient from './_components/analytics-client';

// Server Component : charge la liste des promos actives côté serveur (même
// fonction de service que la route /api/promotions/active) et la passe en
// props à l'îlot client. Plus de fetch au montage → pas de flash de skeleton.
export default async function AnalyticsPage() {
  const promotions = await getActivePromotions();
  const initialPromos = promotions.map((p) => ({
    key: p.key,
    title: p.title,
    eventId: p.eventId,
  }));

  return <AnalyticsClient initialPromos={initialPromos} />;
}
