import { interpolateBandScores } from '../../lib/scoring';
import type { ComparisonPeer } from '../../lib/scoring';
import type { Band } from '../../types/domain';

export interface BandPlan {
  /** New personal_score for every item in this (bucket, band), including the rated item. */
  scoresByItemId: Record<string, number>;
  /** The rated item's own score. */
  ratedItemScore: number;
  /** 0-based rank of the rated item (0 = best) and total band size after insert. */
  rank: number;
  bandSize: number;
}

/**
 * Inserts the rated item into the band ranking at `insertionIndex` and
 * re-interpolates every score in the band (SPEC 5.1 recomputeBandScores).
 * Pure — persistence happens in the api layer.
 */
export function buildBandPlan(
  peers: ComparisonPeer[],
  insertionIndex: number,
  band: Band,
  ratedItemId: string,
): BandPlan {
  const orderedIds = peers.map((p) => p.itemId);
  const boundedIndex = Math.min(Math.max(insertionIndex, 0), orderedIds.length);
  orderedIds.splice(boundedIndex, 0, ratedItemId);

  const scores = interpolateBandScores(orderedIds.length, band);
  const scoresByItemId: Record<string, number> = {};
  orderedIds.forEach((id, i) => {
    scoresByItemId[id] = scores[i];
  });

  return {
    scoresByItemId,
    ratedItemScore: scoresByItemId[ratedItemId],
    rank: boundedIndex,
    bandSize: orderedIds.length,
  };
}
