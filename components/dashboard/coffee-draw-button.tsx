'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Loader2, Shuffle } from 'lucide-react';

export function CoffeeDrawButton({ hasExisting }: { hasExisting: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function draw() {
    setLoading(true);
    try {
      const res = await fetch('/api/coffee-draws', { method: 'POST' });
      const data = await res.json();
      if (data?.success) {
        const n = data.data?.draw?.participants?.length ?? 0;
        toast.success(`Tirage effectué — ${n} apprenant${n > 1 ? 's' : ''}`);
        startTransition(() => router.refresh());
      } else {
        toast.error(data?.error?.message ?? 'Échec du tirage');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  const busy = loading || isPending;

  return (
    <Button size="sm" variant={hasExisting ? 'outline' : 'default'} disabled={busy} onClick={draw}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4" />}
      {hasExisting ? 'Re-tirer' : 'Tirer au sort'}
    </Button>
  );
}
