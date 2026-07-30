'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Loader2, Shuffle } from 'lucide-react';

export function CoffeeDrawButton({
  hasExisting,
  defaultIncludeAlternants = true,
  defaultQuota = 10,
}: {
  hasExisting: boolean;
  defaultIncludeAlternants?: boolean;
  defaultQuota?: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [includeAlternants, setIncludeAlternants] = useState(defaultIncludeAlternants);
  const [quota, setQuota] = useState(String(defaultQuota));

  async function draw() {
    setLoading(true);
    try {
      const n = Math.max(1, Math.min(50, parseInt(quota, 10) || 10));
      const res = await fetch('/api/coffee-draws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeAlternants, quota: n }),
      });
      const data = await res.json();
      if (data?.success) {
        const n = data.data?.draw?.participants?.length ?? 0;
        toast.success(
          `Tirage effectué — ${n} apprenant${n > 1 ? 's' : ''} (alternants ${includeAlternants ? 'inclus' : 'exclus'})`,
        );
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
    <div className="flex items-center gap-3 flex-wrap">
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground select-none">
        Nombre
        <Input
          type="number"
          min={1}
          max={50}
          value={quota}
          onChange={(e) => setQuota(e.target.value)}
          disabled={busy}
          className="h-8 w-16"
          aria-label="Nombre d'apprenants à tirer"
        />
      </label>
      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
        <Switch
          checked={includeAlternants}
          onCheckedChange={setIncludeAlternants}
          disabled={busy}
          aria-label="Inclure les alternants dans le tirage"
        />
        Alternants
      </label>
      <Button size="sm" variant={hasExisting ? 'outline' : 'default'} disabled={busy} onClick={draw}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4" />}
        {hasExisting ? 'Re-tirer' : 'Tirer au sort'}
      </Button>
    </div>
  );
}
