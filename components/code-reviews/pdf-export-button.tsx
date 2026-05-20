'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PromoOption {
  eventId: number | string;
  key: string;
  title?: string;
}

/**
 * PDF export trigger — popover with cover toggle + promo exclusion checkboxes.
 * Self-contained: fetches the active promo list itself, calls
 * /api/audits/export/pdf, downloads the result.
 *
 * Extracted from the old /code-reviews/all page so we can reuse it in /suivi
 * (and anywhere else later) without dragging in 1700 lines of audit table.
 */
export function PdfExportButton() {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [includeCover, setIncludeCover] = useState(false);
  const [excludedPromos, setExcludedPromos] = useState<Set<string>>(new Set());
  const [promos, setPromos] = useState<PromoOption[] | null>(null);

  useEffect(() => {
    if (!open || promos !== null) return;
    fetch('/api/promotions/active')
      .then((r) => r.json())
      .then((data) => {
        if (data?.success) setPromos(data.promotions ?? []);
        else setPromos([]);
      })
      .catch(() => setPromos([]));
  }, [open, promos]);

  async function handleExport() {
    setOpen(false);
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (!includeCover) params.set('cover', 'false');
      if (excludedPromos.size > 0) {
        params.set('exclude', [...excludedPromos].join(','));
      }
      const res = await fetch(`/api/audits/export/pdf?${params.toString()}`);
      if (!res.ok) throw new Error('Erreur serveur');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audits-export-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF généré');
    } catch {
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setExporting(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={exporting} className="gap-2">
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
          {exporting ? 'Génération…' : 'Export PDF'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end">
        <p className="text-sm font-semibold mb-3">Options d&apos;export PDF</p>

        <div className="flex items-center justify-between mb-4">
          <Label htmlFor="pdf-cover" className="text-sm cursor-pointer">
            Page de couverture
          </Label>
          <Switch id="pdf-cover" checked={includeCover} onCheckedChange={setIncludeCover} />
        </div>

        <p className="text-xs text-muted-foreground uppercase font-medium tracking-wide mb-2">
          Promos à inclure
        </p>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 mb-4">
          {promos === null ? (
            <p className="text-xs text-muted-foreground">Chargement…</p>
          ) : promos.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucune promo active.</p>
          ) : (
            promos.map((p) => {
              const id = String(p.eventId);
              const label = p.title || p.key;
              return (
                <div key={id} className="flex items-center gap-2">
                  <Checkbox
                    id={`pdf-promo-${id}`}
                    checked={!excludedPromos.has(id)}
                    onCheckedChange={(checked) => {
                      setExcludedPromos((prev) => {
                        const next = new Set(prev);
                        if (checked) next.delete(id);
                        else next.add(id);
                        return next;
                      });
                    }}
                  />
                  <Label htmlFor={`pdf-promo-${id}`} className="text-sm cursor-pointer">
                    {label}
                  </Label>
                </div>
              );
            })
          )}
        </div>

        <Button size="sm" className="w-full gap-2" onClick={handleExport}>
          <FileDown className="h-4 w-4" />
          Générer le PDF
        </Button>
      </PopoverContent>
    </Popover>
  );
}
