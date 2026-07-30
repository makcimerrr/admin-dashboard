'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, DownloadCloud } from 'lucide-react';

export function EmargementSyncButton({ onSynced }: { onSynced?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function sync() {
    setLoading(true);
    try {
      const res = await fetch('/api/emargement/sync', { method: 'POST' });
      const data = await res.json();
      if (data?.success) {
        const { studentsArchived, studentsAlternant } = data.data ?? {};
        toast.success(
          `Synchro émargement OK — ${studentsAlternant ?? 0} alternant(s), ${studentsArchived ?? 0} archivé(s)`,
        );
        onSynced?.();
      } else {
        toast.error(data?.error?.message ?? 'Échec de la synchro');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <DownloadCloud className="h-4 w-4" />
          )}
          Synchroniser depuis émargement
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Synchroniser les statuts depuis émargement ?</AlertDialogTitle>
          <AlertDialogDescription>
            Émargement est la source de vérité : les statuts <b>archivé</b> et{' '}
            <b>alternant</b> (+ dates de contrat) du hub seront alignés dessus.
            Les données alternant saisies à la main dans le hub seront{' '}
            <b>écrasées</b>. Émargement n’est jamais modifié.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              sync();
            }}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
            Synchroniser
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
