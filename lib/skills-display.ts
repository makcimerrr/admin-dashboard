import { PILL, type Tone } from '@/lib/status-pills';

export type AffinityLabel = 'tres_actif' | 'actif' | 'modere' | 'faible' | 'inactif';

/** Libellé humain + tonalité pour un affinityLabel Gitea. */
export const AFFINITY_DISPLAY: Record<AffinityLabel, { label: string; tone: Tone }> = {
  tres_actif: { label: 'Très actif', tone: 'emerald' },
  actif: { label: 'Actif', tone: 'blue' },
  modere: { label: 'Modéré', tone: 'amber' },
  faible: { label: 'Faible', tone: 'orange' },
  inactif: { label: 'Inactif', tone: 'rose' },
};

export function affinityPill(label: string): string {
  const entry = AFFINITY_DISPLAY[(label as AffinityLabel)] ?? AFFINITY_DISPLAY.inactif;
  return PILL[entry.tone];
}

export function affinityText(label: string): string {
  return (AFFINITY_DISPLAY[(label as AffinityLabel)] ?? AFFINITY_DISPLAY.inactif).label;
}
