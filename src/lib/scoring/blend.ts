import { round2 } from './bands';
import { clamp } from './content';
import type { Prediction } from '../../types/domain';

export interface BlendInputs {
  /** The user's own score if they already rated the item. */
  userScore: number | null;
  /** Collaborative prediction (SPEC 5.4); null when unavailable. */
  collabScore: number | null;
  /** How many qualified neighbors backed collabScore. */
  neighborsUsed: number;
  /** Content-based prediction (SPEC 5.3); null for a cold profile. */
  contentScore: number | null;
  /** Community weighted score (SPEC 5.2); null when the item has no ratings. */
  communityScore: number | null;
  /** Community rating volume for the item. */
  itemNumRatings: number;
  /** How many items this user has rated in total. */
  userRatingsCount: number;
  confidenceThreshold?: number;
}

/**
 * Blended "For You" prediction (SPEC 5.5). Weights shift toward collaborative
 * filtering as data grows. Cold-profile rule: below the confidence threshold
 * the community number leads (source 'community', lowConfidence) — never a
 * confident personalized score for a profile the app knows nothing about.
 * Returns null when there is nothing to show at all (no personal signal AND
 * no community data) — the UI renders "score forming".
 */
export function predictForYou(inputs: BlendInputs): Prediction | null {
  const threshold = inputs.confidenceThreshold ?? 0.3;

  if (inputs.userScore !== null) {
    return { score: inputs.userScore, source: 'user', confidence: 1, lowConfidence: false };
  }

  const collabConfidence =
    inputs.collabScore !== null ? clamp(inputs.neighborsUsed / 3, 0, 1) : 0;
  const contentConfidence =
    inputs.contentScore !== null ? clamp(inputs.userRatingsCount / 8, 0, 1) : 0;
  const confidence = round2(Math.max(collabConfidence, 0.8 * contentConfidence));

  const communityAvailable = inputs.communityScore !== null;

  if (confidence < threshold) {
    if (communityAvailable) {
      return {
        score: inputs.communityScore as number,
        source: 'community',
        confidence,
        lowConfidence: true,
      };
    }
    return null; // nothing trustworthy to show → "score forming"
  }

  // Weighted blend of available sources; collab dominates as it matures.
  const parts: { score: number; weight: number }[] = [];
  if (inputs.collabScore !== null) parts.push({ score: inputs.collabScore, weight: 2 * collabConfidence });
  if (inputs.contentScore !== null) parts.push({ score: inputs.contentScore, weight: contentConfidence });
  if (communityAvailable) {
    const communityWeight = clamp(inputs.itemNumRatings / 20, 0, 1) * 0.75;
    parts.push({ score: inputs.communityScore as number, weight: communityWeight });
  }
  const usable = parts.filter((p) => p.weight > 0);
  const totalWeight = usable.reduce((s, p) => s + p.weight, 0);
  if (totalWeight === 0) return null;

  const score = round2(clamp(usable.reduce((s, p) => s + p.score * p.weight, 0) / totalWeight, 0, 10));
  const personalSources = (inputs.collabScore !== null ? 1 : 0) + (inputs.contentScore !== null ? 1 : 0);
  const source =
    personalSources >= 2 || (personalSources === 1 && communityAvailable)
      ? 'blend'
      : inputs.collabScore !== null
        ? 'collab'
        : 'content';

  return { score, source, confidence, lowConfidence: false };
}
