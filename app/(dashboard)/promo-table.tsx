import { Button } from '@/components/ui/button';

interface Promo {
  key: string;
  eventId: number;
  title: string;
}

interface PromoTableProps {
  promos: Promo[];
  onDelete: (key: string) => void;
  isConfirmingDelete: string | null; // Permet de savoir quelle promo est en train de être confirmée pour suppression
  cancelDelete: () => void; // Fonction pour annuler la suppression
  confirmDelete: (key: string) => Promise<void>; // Fonction pour confirmer la suppression
}

export default function PromoTable({ promos, onDelete, isConfirmingDelete, cancelDelete, confirmDelete }: PromoTableProps) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
        <tr className="bg-gray-100">
          <th className="p-2 text-left">Clé</th>
          <th className="p-2 text-left">ID</th>
          <th className="p-2 text-left">Titre</th>
          <th className="p-2 text-left">Actions</th>
        </tr>
        </thead>
        <tbody>
        {promos.map((promo) => (
          <tr key={promo.key} className="border-t">
            <td className="p-2">{promo.key}</td>
            <td className="p-2">{promo.eventId}</td>
            <td className="p-2">{promo.title}</td>
            <td className="p-2">
              {isConfirmingDelete === promo.key ? (
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" onClick={() => confirmDelete(promo.key)}>
                    Confirmer
                  </Button>
                  <Button variant="outline" size="sm" onClick={cancelDelete}>
                    Annuler
                  </Button>
                </div>
              ) : (
                <Button variant="destructive" size="sm" onClick={() => onDelete(promo.key)}>
                  Supprimer
                </Button>
              )}
            </td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  );
}