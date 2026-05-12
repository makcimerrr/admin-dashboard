/**
 * Shared status pill / tile palettes used across the dashboard.
 *
 * Each entry uses `color/15` (or `color/10`) alpha tints so the pills stay
 * legible in both light and dark themes without needing two parallel class
 * sets.
 *
 *     <Badge variant="outline" className={PILL.amber}>Attente</Badge>
 *     <div className={cn('p-3 rounded-lg border', TILE.emerald)}>...</div>
 */

export type Tone =
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'red'
  | 'blue'
  | 'orange'
  | 'violet'
  | 'cyan';

export const PILL: Record<Tone, string> = {
  emerald:
    'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400',
  amber:
    'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400',
  rose: 'bg-rose-500/15 text-rose-700 border-rose-500/30 dark:text-rose-400',
  red: 'bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400',
  blue: 'bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400',
  orange:
    'bg-orange-500/15 text-orange-700 border-orange-500/30 dark:text-orange-400',
  violet:
    'bg-violet-500/15 text-violet-700 border-violet-500/30 dark:text-violet-400',
  cyan: 'bg-cyan-500/15 text-cyan-700 border-cyan-500/30 dark:text-cyan-400',
};

export const TILE: Record<Tone, string> = {
  emerald:
    'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  amber:
    'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  rose: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400',
  red: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400',
  blue: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400',
  orange:
    'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400',
  violet:
    'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400',
  cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
};

export const ROW: Record<Tone, string> = {
  emerald: 'bg-emerald-500/5 hover:bg-emerald-500/10',
  amber: 'bg-amber-500/5 hover:bg-amber-500/10',
  rose: 'bg-rose-500/5 hover:bg-rose-500/10',
  red: 'bg-red-500/5 hover:bg-red-500/10',
  blue: 'bg-blue-500/5 hover:bg-blue-500/10',
  orange: 'bg-orange-500/5 hover:bg-orange-500/10',
  violet: 'bg-violet-500/5 hover:bg-violet-500/10',
  cyan: 'bg-cyan-500/5 hover:bg-cyan-500/10',
};

/** emerald ≥ 80, amber ≥ 50, red otherwise. */
export function validationPill(rate: number): string {
  if (rate >= 80) return PILL.emerald;
  if (rate >= 50) return PILL.amber;
  return PILL.red;
}

/** urgent → rose, warning → amber, normal → emerald. */
export function priorityPill(p: 'urgent' | 'warning' | 'normal'): string {
  if (p === 'urgent') return PILL.rose;
  if (p === 'warning') return PILL.amber;
  return PILL.emerald;
}
