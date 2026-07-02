import { buildBandPlan } from './plan';
import {
  applyBandScores,
  logComparisons,
  upsertRating,
  listMyRatingsWithItems,
  type ComparisonLog,
} from '../../lib/db/ratings';
import { upsertTasteProfile } from '../../lib/db/tasteProfiles';
import {
  attributesToVector,
  buildTasteProfile,
  defaultWouldOrderAgain,
  type ComparisonPeer,
} from '../../lib/scoring';
import type { Band, Item, Rating } from '../../types/domain';

export interface SaveRatingInput {
  userId: string;
  item: Item;
  band: Band;
  note: string | null;
  peers: ComparisonPeer[];
  insertionIndex: number;
  comparisons: Omit<ComparisonLog, 'userId' | 'bucket' | 'band'>[];
}

export interface SaveRatingResult {
  rating: Rating;
  rank: number;
  bandSize: number;
}

/**
 * Persists a completed rating flow (SPEC 5.1 submitRating):
 * upsert the rating, re-score the whole band atomically, log comparisons,
 * then refresh the content-based taste profile (SPEC 5.3 / Section 8).
 */
export async function saveRating(input: SaveRatingInput): Promise<SaveRatingResult> {
  const plan = buildBandPlan(input.peers, input.insertionIndex, input.band, input.item.id);

  const rating = await upsertRating({
    userId: input.userId,
    itemId: input.item.id,
    band: input.band,
    wouldOrderAgain: defaultWouldOrderAgain(input.band),
    personalScore: plan.ratedItemScore,
    note: input.note,
  });

  await applyBandScores(input.item.bucket, input.band, plan.scoresByItemId);

  await logComparisons(
    input.comparisons.map((c) => ({
      ...c,
      userId: input.userId,
      bucket: input.item.bucket,
      band: input.band,
    })),
  );

  await refreshTasteProfile(input.userId);

  return { rating, rank: plan.rank, bandSize: plan.bandSize };
}

/** Rebuilds and persists the user's content-based taste profile from all ratings. */
export async function refreshTasteProfile(userId: string): Promise<void> {
  const rated = await listMyRatingsWithItems(userId);
  const profile = buildTasteProfile(
    rated.map(({ rating, item }) => ({
      vector: attributesToVector(item.attributes, item.tagSlugs),
      personalScore: rating.personalScore,
    })),
  );
  await upsertTasteProfile(userId, profile);
}
