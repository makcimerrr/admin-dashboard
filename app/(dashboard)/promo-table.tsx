import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"


interface Promo {
  key: string;
  eventId: number;
  title: string;
  dates: {
    start: string;
    'piscine-js-start': string;
    'piscine-js-end': string;
    'piscine-rust-java-start': string;
    'piscine-rust-java-end': string;
    end: string;
  };
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
    <Table className="overflow-auto w-full text-sm">
      <TableCaption>Liste des promotions</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="p-2 text-left">Clé</TableHead>
          <TableHead className="p-2 text-left">ID</TableHead>
          <TableHead className="p-2 text-left">Titre</TableHead>
          <TableHead className="p-2 text-left">Date de début</TableHead>
          <TableHead className="p-2 text-left">Date de fin</TableHead>
          <TableHead className="p-2 text-left">Piscine JS</TableHead>
          <TableHead className="p-2 text-left">Piscine RUST/JAVA</TableHead>
          <TableHead className="p-2 text-left">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {promos.map((promo) => (
          <TableRow key={promo.key} className="border-t">
            <TableCell className="p-2">{promo.key}</TableCell>
            <TableCell className="p-2">{promo.eventId}</TableCell>
            <TableCell className="p-2">{promo.title}</TableCell>
            <TableCell className="p-2">{promo.dates.start}</TableCell>
            <TableCell className="p-2">{promo.dates.end}</TableCell>
            <TableCell className="p-2">
              {promo.dates['piscine-js-start']} - {promo.dates['piscine-js-end']}
            </TableCell>
            <TableCell className="p-2">
              {promo.dates['piscine-rust-java-start']} - {promo.dates['piscine-rust-java-end']}
            </TableCell>
            <TableCell className="p-2">
              {isConfirmingDelete === promo.key ? (
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => confirmDelete(promo.key)}
                  >
                    Confirmer
                  </Button>
                  <Button variant="outline" size="sm" onClick={cancelDelete}>
                    Annuler
                  </Button>
                </div>
              ) : (
                <Button
                  variant="destructive"
                  size="sm"
                  className="text-sm text-red-200 hover:text-red-800 transition-colors"
                  onClick={() => onDelete(promo.key)}
                >
                  Supprimer
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}