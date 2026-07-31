'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Building2, Pencil, Check, X, Loader2 } from 'lucide-react';

/**
 * Saisie manuelle de l'entreprise d'un alternant (émargement ne la fournit pas).
 * PATCH /api/student/[id]/alternant → stocké sur students.company_name (durable,
 * réappliqué aux contrats par la synchro) + propagé aux contrats synchronisés.
 */
export function CompanyEditor({
  studentId,
  initialCompany,
  onSaved,
}: {
  studentId: number;
  initialCompany: string | null;
  onSaved?: () => void;
}) {
  const [company, setCompany] = useState(initialCompany ?? '');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(company);
  const [loading, setLoading] = useState(false);

  const isPlaceholder = !company || company === 'Non renseigné';

  async function save() {
    setLoading(true);
    try {
      const res = await fetch(`/api/student/${studentId}/alternant`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: draft.trim() }),
      });
      const data = await res.json();
      if (data?.success) {
        setCompany(draft.trim());
        setEditing(false);
        toast.success('Entreprise mise à jour');
        onSaved?.();
      } else {
        toast.error(data?.error ?? 'Échec de la mise à jour');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
      <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
      {editing ? (
        <>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Nom de l'entreprise"
            className="h-8"
            autoFocus
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') {
                setDraft(company);
                setEditing(false);
              }
            }}
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            disabled={loading}
            onClick={save}
            aria-label="Enregistrer l'entreprise"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            disabled={loading}
            onClick={() => {
              setDraft(company);
              setEditing(false);
            }}
            aria-label="Annuler"
          >
            <X className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <>
          <span
            className={`flex-1 truncate text-sm ${
              isPlaceholder ? 'italic text-muted-foreground' : 'font-medium'
            }`}
          >
            {isPlaceholder ? 'Entreprise non renseignée' : company}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 shrink-0 gap-1.5 text-xs"
            onClick={() => {
              setDraft(isPlaceholder ? '' : company);
              setEditing(true);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
            {isPlaceholder ? 'Renseigner' : 'Modifier'}
          </Button>
        </>
      )}
    </div>
  );
}
