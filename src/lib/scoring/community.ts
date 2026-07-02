import { round2 } from './bands';
import type { Band } from '../../types/domain';

/**
 * Bayesian weighted community score (SPEC 5.2):
 *   weighted = (v/(v+m))*R + (m/(v+m))*C
 * Low-volume items are pulled toward the global mean C, resisting brigading.
 */
export function weightedScore(itemMean: number, numRatings: number, globalMean: number, m = 10): number {
  if (numRatings <= 0) return round2(globalMean);
  const v = numRatings;
  return round2((v / (v + m)) * itemMean + (m / (v + m)) * globalMean);
}

export function worthItPct(wouldOrderAgainCount: number, numRatings: number): number | null {
  if (numRatings <= 0) return null;
  return round2((100 * wouldOrderAgainCount) / numRatings);
}

export interface BandDistribution {
  loved: number;
  fine: number;
  disliked: number;
}

export function bandDistribution(bands: Band[]): BandDistribution {
  const dist: BandDistribution = { loved: 0, fine: 0, disliked: 0 };
  for (const band of bands) dist[band] += 1;
  return dist;
}

/** Display rule (SPEC 5.2): below 5 ratings an item shows "score forming". */
export function isScoreForming(numRatings: number, minRatings = 5): boolean {
  return numRatings < minRatings;
}
