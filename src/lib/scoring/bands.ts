import type { Band } from '../../types/domain';

/** Band → score range mapping (SPEC 5.1). */
export const BAND_RANGES: Record<Band, readonly [number, number]> = {
  loved: [7.0, 10.0],
  fine: [4.0, 6.9],
  disliked: [0.0, 3.9],
} as const;

export function bandRange(band: Band): readonly [number, number] {
  return BAND_RANGES[band];
}

export function midpoint([lo, hi]: readonly [number, number]): number {
  return round2((lo + hi) / 2);
}

/** Default would-order-again: loved + fine = true (tunable per SPEC 5.1). */
export function defaultWouldOrderAgain(band: Band): boolean {
  return band !== 'disliked';
}

/** The band a 0–10 score falls in; used for verdict colors. */
export function bandForScore(score: number): Band {
  if (score >= 7) return 'loved';
  if (score >= 4) return 'fine';
  return 'disliked';
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Evenly interpolated scores for a ranked band list, best first (SPEC 5.1
 * recomputeBandScores): best → hi, worst → lo; single item → midpoint.
 */
export function interpolateBandScores(count: number, band: Band): number[] {
  const [lo, hi] = bandRange(band);
  if (count <= 0) return [];
  if (count === 1) return [midpoint([lo, hi])];
  const scores: number[] = [];
  for (let i = 0; i < count; i++) {
    scores.push(round2(hi - (i / (count - 1)) * (hi - lo)));
  }
  return scores;
}
