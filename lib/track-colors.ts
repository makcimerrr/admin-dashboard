/**
 * Theme-aware accent colours for the 4 tracks.
 *
 * Uses CSS chart variables (`var(--chart-N)`) so the colours follow the
 * active theme palette instead of being hardcoded.
 *
 *   - Golang     → chart-1
 *   - Javascript → chart-2
 *   - Rust       → chart-3
 *   - Java       → chart-4
 */

export const TRACK_ACCENT: Record<string, string> = {
  Golang: 'var(--chart-1)',
  Javascript: 'var(--chart-2)',
  Rust: 'var(--chart-3)',
  Java: 'var(--chart-4)',
};

export function trackAccent(track: string): string {
  return TRACK_ACCENT[track] ?? 'hsl(var(--muted-foreground))';
}

/**
 * Inline style for a track-coloured chip / badge. Uses color-mix for the
 * subtle tinted background + border so contrast stays correct in both
 * light and dark themes.
 *
 *     <span style={trackChipStyle('Golang')}>Golang</span>
 */
export function trackChipStyle(track: string): React.CSSProperties {
  const c = trackAccent(track);
  return {
    backgroundColor: `color-mix(in srgb, ${c} 12%, transparent)`,
    color: c,
    borderColor: `color-mix(in srgb, ${c} 28%, transparent)`,
  };
}

/**
 * Inline style for a solid dot / pill (just the bg colour).
 */
export function trackDotStyle(track: string): React.CSSProperties {
  return { backgroundColor: trackAccent(track) };
}
