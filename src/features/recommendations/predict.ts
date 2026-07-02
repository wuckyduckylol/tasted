import {
  predictContent,
  predictForYou,
  type FeatureVector,
} from '../../lib/scoring';
import type { Item, ItemScore, Prediction, Rating } from '../../types/domain';

export interface PredictInputs {
  items: Item[];
  ratingsByItemId: Map<string, Rating>;
  profile: FeatureVector;
  scores: Map<string, ItemScore>;
  userRatingsCount: number;
}

/**
 * Runs the SPEC 5.5 blend for a list of items. Collaborative inputs arrive in
 * Phase 10; until then collab is null and the blend uses content + community.
 */
export function predictForItems(inputs: PredictInputs): Map<string, Prediction | null> {
  const out = new Map<string, Prediction | null>();
  for (const item of inputs.items) {
    const score = inputs.scores.get(item.id) ?? null;
    out.set(
      item.id,
      predictForYou({
        userScore: inputs.ratingsByItemId.get(item.id)?.personalScore ?? null,
        collabScore: null,
        neighborsUsed: 0,
        contentScore: predictContent(inputs.profile, item.attributes, item.tagSlugs),
        communityScore: score?.weightedScore ?? null,
        itemNumRatings: score?.numRatings ?? 0,
        userRatingsCount: inputs.userRatingsCount,
      }),
    );
  }
  return out;
}

export type LeadDisplay =
  | { kind: 'own'; score: number }
  | { kind: 'predicted'; score: number }
  | { kind: 'community'; worthItPct: number }
  | { kind: 'forming' };

/**
 * The lead number for a menu row (SPEC 6.4):
 * rated → own score; For You → prediction (community Worth It % while the
 * profile is cold); Best Overall → Worth It %; under 5 ratings → forming.
 */
export function leadDisplay(
  mode: 'forYou' | 'bestOverall',
  rating: Rating | null,
  prediction: Prediction | null,
  score: ItemScore | null,
): LeadDisplay {
  if (rating) return { kind: 'own', score: rating.personalScore };

  const communityVisible =
    score !== null && score.numRatings >= 5 && score.worthItPct !== null;

  if (mode === 'bestOverall') {
    return communityVisible
      ? { kind: 'community', worthItPct: score.worthItPct as number }
      : { kind: 'forming' };
  }

  if (prediction === null) return { kind: 'forming' };
  if (prediction.source === 'community' || prediction.lowConfidence) {
    return communityVisible
      ? { kind: 'community', worthItPct: score.worthItPct as number }
      : { kind: 'forming' };
  }
  return { kind: 'predicted', score: prediction.score };
}

/**
 * The onboarding payoff (SPEC 6.2): the highest personally-predicted item the
 * user has NOT rated. Community fallbacks don't count — the point is showing
 * the taste profile working. Null when no confident personal prediction exists.
 */
export function pickFirstRecommendation(
  items: Item[],
  predictions: Map<string, Prediction | null>,
  ratingsByItemId: Map<string, Rating>,
): { item: Item; prediction: Prediction } | null {
  let best: { item: Item; prediction: Prediction } | null = null;
  for (const item of items) {
    if (ratingsByItemId.has(item.id)) continue;
    const prediction = predictions.get(item.id);
    if (!prediction || prediction.lowConfidence) continue;
    if (prediction.source !== 'content' && prediction.source !== 'blend' && prediction.source !== 'collab') {
      continue;
    }
    if (!best || prediction.score > best.prediction.score) {
      best = { item, prediction };
    }
  }
  return best;
}

/** Sort key for a row per SPEC 6.4 default sorts; forming rows sink to the bottom. */
export function sortValue(display: LeadDisplay): number {
  switch (display.kind) {
    case 'own':
    case 'predicted':
      return display.score;
    case 'community':
      return display.worthItPct / 10;
    case 'forming':
      return -1;
  }
}
