'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RotateCw } from 'lucide-react';

export interface CoffeeParticipant {
  id: number;
  firstName: string;
  lastName: string;
  promoName: string;
  isAlternant: boolean;
}

export function CoffeeParticipantRow({ participant }: { participant: CoffeeParticipant }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function redraw() {
    setLoading(true);
    try {
      const res = await fetch(`/api/coffee-draws/participants/${participant.id}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data?.success) {
        toast.success('Apprenant re-tiré');
        startTransition(() => router.refresh());
      } else {
        toast.error(data?.error?.message ?? 'Échec du re-tirage');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  const busy = loading || isPending;

  return (
    <li className="flex items-center justify-between gap-2 rounded-lg border bg-background/50 px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-medium truncate">
          {participant.firstName} {participant.lastName}
        </span>
        {participant.isAlternant && (
          <Badge
            variant="secondary"
            className="shrink-0 text-[10px] bg-primary/10 text-primary border-primary/20"
          >
            Alternant
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Badge variant="outline" className="text-[10px]">
          {participant.promoName}
        </Badge>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          disabled={busy}
          onClick={redraw}
          title="Re-tirer cet apprenant"
          aria-label={`Re-tirer ${participant.firstName} ${participant.lastName}`}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </li>
  );
}
