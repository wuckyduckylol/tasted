import type { Band } from '../types/domain';

/**
 * Interim design tokens (SPEC.md Section 12.6). A dedicated UI pass comes later;
 * keep all colors flowing through here so that pass is a one-file change.
 */
export const colors = {
  base: '#FAF7F2', // warm off-white
  baseDark: '#17150F', // warm charcoal
  accent: '#FF5A36', // flame coral
  // Verdict colors — reserved for scores ONLY (never decorative use).
  loved: '#2FBF71',
  fine: '#F5A623',
  disliked: '#E4433B',
  text: '#17150F',
  textMuted: '#6F6A5F',
  card: '#FFFFFF',
  border: '#E7E1D6',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

/** Minimum tap target per accessibility requirement (Section 12.3). */
export const minTapTarget = 44;

export function bandColor(band: Band): string {
  return colors[band];
}

/** Verdict color for a 0–10 score, using the band ranges from Section 5.1. */
export function scoreColor(score: number): string {
  if (score >= 7) return colors.loved;
  if (score >= 4) return colors.fine;
  return colors.disliked;
}
