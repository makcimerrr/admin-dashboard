import PromoManager from '../promo-management';

export default function PromoPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Gestion des Promotions</h1>
      <PromoManager />
    </div>
  );
}