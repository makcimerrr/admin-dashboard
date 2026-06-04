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

// Single palette (noir/blanc/bleu) — legacy tones are remapped onto the
// semantic tokens so existing call sites keep working:
//   emerald            → success
//   amber / orange     → warning
//   red / rose         → destructive
//   blue / cyan / violet → primary (info)

const PILL_SUCCESS = 'bg-success/15 text-success border-success/30';
const PILL_WARNING = 'bg-warning/15 text-warning border-warning/30';
const PILL_DESTRUCTIVE = 'bg-destructive/15 text-destructive border-destructive/30';
const PILL_PRIMARY = 'bg-primary/15 text-primary border-primary/30';

export const PILL: Record<Tone, string> = {
  emerald: PILL_SUCCESS,
  amber: PILL_WARNING,
  orange: PILL_WARNING,
  rose: PILL_DESTRUCTIVE,
  red: PILL_DESTRUCTIVE,
  blue: PILL_PRIMARY,
  cyan: PILL_PRIMARY,
  violet: PILL_PRIMARY,
};

const TILE_SUCCESS = 'border-success/30 bg-success/10 text-success';
const TILE_WARNING = 'border-warning/30 bg-warning/10 text-warning';
const TILE_DESTRUCTIVE = 'border-destructive/30 bg-destructive/10 text-destructive';
const TILE_PRIMARY = 'border-primary/30 bg-primary/10 text-primary';

export const TILE: Record<Tone, string> = {
  emerald: TILE_SUCCESS,
  amber: TILE_WARNING,
  orange: TILE_WARNING,
  rose: TILE_DESTRUCTIVE,
  red: TILE_DESTRUCTIVE,
  blue: TILE_PRIMARY,
  cyan: TILE_PRIMARY,
  violet: TILE_PRIMARY,
};

const ROW_SUCCESS = 'bg-success/5 hover:bg-success/10';
const ROW_WARNING = 'bg-warning/5 hover:bg-warning/10';
const ROW_DESTRUCTIVE = 'bg-destructive/5 hover:bg-destructive/10';
const ROW_PRIMARY = 'bg-primary/5 hover:bg-primary/10';

export const ROW: Record<Tone, string> = {
  emerald: ROW_SUCCESS,
  amber: ROW_WARNING,
  orange: ROW_WARNING,
  rose: ROW_DESTRUCTIVE,
  red: ROW_DESTRUCTIVE,
  blue: ROW_PRIMARY,
  cyan: ROW_PRIMARY,
  violet: ROW_PRIMARY,
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
