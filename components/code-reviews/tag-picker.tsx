'use client';

import { CR_TAG_GROUPS } from '@/lib/code-review-tags';
import { cn } from '@/lib/utils';

/**
 * Sélecteur de tags points forts / points faibles d'un apprenant en CR.
 * Chaque tag cycle : neutre → point FORT (vert, +) → point FAIBLE (rouge, −) → neutre.
 */
export function TagPicker({
  strengths,
  weaknesses,
  onChange,
  disabled = false,
}: {
  strengths: string[];
  weaknesses: string[];
  onChange: (next: { strengths: string[]; weaknesses: string[] }) => void;
  disabled?: boolean;
}) {
  const cycle = (tag: string) => {
    if (strengths.includes(tag)) {
      onChange({
        strengths: strengths.filter((t) => t !== tag),
        weaknesses: [...weaknesses, tag],
      });
    } else if (weaknesses.includes(tag)) {
      onChange({ strengths, weaknesses: weaknesses.filter((t) => t !== tag) });
    } else {
      onChange({ strengths: [...strengths, tag], weaknesses });
    }
  };

  return (
    <div className="space-y-1.5">
      {CR_TAG_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-wrap items-baseline gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70 w-20 shrink-0">
            {group.label}
          </span>
          {group.tags.map((tag) => {
            const isStrength = strengths.includes(tag);
            const isWeakness = weaknesses.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                disabled={disabled}
                onClick={() => cycle(tag)}
                title={
                  isStrength
                    ? `${tag} — point fort (cliquer : point faible)`
                    : isWeakness
                      ? `${tag} — point faible (cliquer : retirer)`
                      : `${tag} (cliquer : point fort)`
                }
                className={cn(
                  'px-2 py-0.5 rounded-full border text-[11px] font-medium transition-colors',
                  isStrength && 'bg-success/15 text-success border-success/40',
                  isWeakness && 'bg-destructive/15 text-destructive border-destructive/40',
                  !isStrength && !isWeakness && 'border-border text-muted-foreground',
                  !disabled && 'cursor-pointer hover:border-muted-foreground/50',
                )}
              >
                {isStrength ? '+ ' : isWeakness ? '− ' : ''}
                {tag}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Affichage lecture seule d'un couple points forts / points faibles. */
export function TagBadges({
  strengths,
  weaknesses,
  size = 'md',
}: {
  strengths: string[];
  weaknesses: string[];
  size?: 'sm' | 'md';
}) {
  if (strengths.length === 0 && weaknesses.length === 0) return null;
  const base = cn(
    'rounded-full border font-medium',
    size === 'sm' ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-[11px]',
  );
  return (
    <div className="flex flex-wrap gap-1">
      {strengths.map((t) => (
        <span key={`s-${t}`} className={cn(base, 'bg-success/15 text-success border-success/40')}>
          + {t}
        </span>
      ))}
      {weaknesses.map((t) => (
        <span key={`w-${t}`} className={cn(base, 'bg-destructive/15 text-destructive border-destructive/40')}>
          − {t}
        </span>
      ))}
    </div>
  );
}
