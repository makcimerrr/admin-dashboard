import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { SelectStudent } from '@/lib/db';
import { deleteStudent } from './actions';

const getProgressStatusClass = (status: string | null) => {
  switch (status) {
    case 'audit':
      return 'bg-orange-500 text-white'; // Couleur orange pour 'audit'
    case 'setup':
      return 'bg-purple-500 text-white'; // Couleur violet pour 'setup'
    case 'working':
      return 'bg-blue-500 text-white'; // Couleur bleue pour 'working'
    case 'finished':
      return 'bg-green-500 text-white'; // Couleur verte pour 'finished'
    case 'without group':
      return 'bg-red-500 text-white'; // Couleur rouge pour 'without group'
    default:
      return 'bg-gray-300 text-black'; // Valeur par défaut pour un statut inconnu
  }
};

const getDelayLevelClass = (level: string | null) => {
  switch (level) {
    case 'bien':
      return 'bg-green-500 text-white'; // Couleur verte pour 'bien'
    case 'en retard':
      return 'bg-red-500 text-white'; // Couleur rouge pour 'en retard'
    case 'en avance':
      return 'bg-blue-500 text-white'; // Couleur bleue pour 'en avance'
    case 'spécialité':
      return 'bg-yellow-500 text-white'; // Couleur jaune pour 'spécialité'
    default:
      return 'bg-gray-300 text-black'; // Valeur par défaut pour un niveau inconnu
  }
};

export function Student({ student }: { student: SelectStudent }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{student.first_name}</TableCell>
      <TableCell>{student.last_name}</TableCell>
      <TableCell>{student.login}</TableCell>
      <TableCell>
        <Badge variant="outline" className="capitalize">
          {student.promos}
        </Badge>
      </TableCell>
      {/* Ajout des nouvelles colonnes */}
      <TableCell>
        <Badge variant="outline" className="capitalize">
          {student.project_name || "N/A"}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={`capitalize ${getProgressStatusClass(student.progress_status)}`}
        >
          {student.progress_status || "N/A"}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={`capitalize ${getDelayLevelClass(student.delay_level)}`}
        >
          {student.delay_level || "N/A"}
        </Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {new Date(student.availableAt).toLocaleDateString('en-US')}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-haspopup="true" size="icon" variant="ghost">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>
              <form action={deleteStudent}>
                <button type="submit">Delete</button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}