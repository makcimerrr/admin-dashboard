'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  ExternalLink,
  UserX,
  UserCheck,
  Briefcase,
  Trash2,
  Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { deleteStudent } from '../../../../actions';

interface ActionsCellProps {
  studentId: number;
  isDropout: boolean;
  isAlternant: boolean;
}

export function ActionsCell({
  studentId,
  isDropout,
  isAlternant
}: ActionsCellProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/student?id=${studentId}`);
  };

  const handleDropoutAction = async (
    e: React.MouseEvent,
    action: 'dropout' | 'reactivate'
  ) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      if (action === 'dropout') {
        const response = await fetch(`/api/student/${studentId}/dropout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'other' })
        });
        if (response.ok) {
          toast.success('Étudiant marqué en perdition');
          router.refresh();
        } else {
          toast.error('Erreur lors du marquage');
        }
      } else {
        const response = await fetch(`/api/student/${studentId}/dropout`, {
          method: 'DELETE'
        });
        if (response.ok) {
          toast.success('Étudiant réactivé');
          router.refresh();
        } else {
          toast.error('Erreur lors de la réactivation');
        }
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAlternantAction = async (
    e: React.MouseEvent,
    action: 'set' | 'remove'
  ) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      if (action === 'set') {
        const response = await fetch(`/api/student/${studentId}/alternant`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        if (response.ok) {
          toast.success('Étudiant marqué comme alternant');
          router.refresh();
        } else {
          toast.error('Erreur lors du marquage');
        }
      } else {
        const response = await fetch(`/api/student/${studentId}/alternant`, {
          method: 'DELETE'
        });
        if (response.ok) {
          toast.success('Statut alternant retiré');
          router.refresh();
        } else {
          toast.error('Erreur lors de la mise à jour');
        }
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button
          aria-haspopup="true"
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreHorizontal className="h-4 w-4" />
          )}
          <span className="sr-only">Ouvrir le menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={handleViewDetails} className="cursor-pointer">
          <ExternalLink className="h-4 w-4 mr-2" />
          Voir les détails
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {isDropout ? (
          <DropdownMenuItem
            onClick={(e) => handleDropoutAction(e, 'reactivate')}
            className="cursor-pointer text-green-600 focus:text-green-600"
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Réactiver l'étudiant
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={(e) => handleDropoutAction(e, 'dropout')}
            className="cursor-pointer text-orange-600 focus:text-orange-600"
          >
            <UserX className="h-4 w-4 mr-2" />
            Marquer en perdition
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {isAlternant ? (
          <DropdownMenuItem
            onClick={(e) => handleAlternantAction(e, 'remove')}
            className="cursor-pointer text-gray-600 focus:text-gray-600"
          >
            <Briefcase className="h-4 w-4 mr-2" />
            Retirer statut alternant
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={(e) => handleAlternantAction(e, 'set')}
            className="cursor-pointer text-blue-600 focus:text-blue-600"
          >
            <Briefcase className="h-4 w-4 mr-2" />
            Marquer alternant
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-red-600 focus:text-red-600 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          <form action={deleteStudent} className="w-full">
            <button
              type="submit"
              className="w-full text-left flex items-center"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
