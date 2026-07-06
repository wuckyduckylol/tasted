import { round2 } from './bands';
import { weightedScore } from './community';

/**
 * Top-10 chain ranking for onboarding (Get Started walkthrough page 2).
 *
 * Industry-standard approach: Bayesian weighted rating (IMDb top-list formula,
 * same shape as SPEC 5.2's item score) computed at chain level, plus a
 * content-based cold-start signal — the user's declared top-3 chains lead the
 * list in pick order. Low-volume chains get pulled toward the global mean so
 * one enthusiastic rating can't crown a chain.
 */

export interface ChainRatingStat {
  chainId: string;
  /** Total community ratings across the chain's items. */
  ratingCount: number;
  /** Rating-count-weighted mean of the chain's item scores (0–10). */
  meanScore: number;
}

/** Aggregates per-item community scores into per-chain stats (pure). */
export function chainStatsFromItemScores(
  rows: { chainId: string; weightedScore: number | null; ratingCount: number }[],
): ChainRatingStat[] {
  const byChain = new Map<string, { count: number; weightedSum: number }>();
  for (const row of rows) {
    if (row.weightedScore === null || row.ratingCount <= 0) continue;
    const agg = byChain.get(row.chainId) ?? { count: 0, weightedSum: 0 };
    agg.count += row.ratingCount;
    agg.weightedSum += row.weightedScore * row.ratingCount;
    byChain.set(row.chainId, agg);
  }
  return [...byChain.entries()].map(([chainId, { count, weightedSum }]) => ({
    chainId,
    ratingCount: count,
    meanScore: round2(weightedSum / count),
  }));
}

export interface TopChainsInput {
  /** Active chain ids in catalog display order (stable tiebreak). */
  chainIds: string[];
  /** Community stats; chains without ratings may be absent. */
  stats: ChainRatingStat[];
  /** The user's top-3 picks, in pick order (rank 1 first). */
  favoriteChainIds: string[];
  /** Bayesian prior weight — how many ratings it takes to trust a chain's own mean. */
  m?: number;
  limit?: number;
}

/** Neutral prior when the platform has no ratings at all yet (0–10 midpoint-ish). */
const NEUTRAL_GLOBAL_MEAN = 5.5;

/** Big enough that any favorite outranks any non-favorite (scores are 0–10). */
const FAVORITE_BOOST = 100;

/**
 * Returns up to `limit` chain ids, best-first:
 * favorites lead in pick order, the rest follow by Bayesian weighted score.
 */
export function rankTopChains({
  chainIds,
  stats,
  favoriteChainIds,
  m = 10,
  limit = 10,
}: TopChainsInput): string[] {
  const statByChain = new Map(stats.map((s) => [s.chainId, s]));

  const totalCount = stats.reduce((sum, s) => sum + s.ratingCount, 0);
  const globalMean =
    totalCount > 0
      ? stats.reduce((sum, s) => sum + s.meanScore * s.ratingCount, 0) / totalCount
      : NEUTRAL_GLOBAL_MEAN;

  const favoriteRank = new Map(favoriteChainIds.map((id, i) => [id, i]));

  const scored = chainIds.map((chainId, catalogIndex) => {
    const stat = statByChain.get(chainId);
    const base = stat
      ? weightedScore(stat.meanScore, stat.ratingCount, globalMean, m)
      : weightedScore(globalMean, 0, globalMean, m); // no data → global mean
    const favIndex = favoriteRank.get(chainId);
    // Favorites always lead; earlier picks beat later picks.
    const boost = favIndex === undefined ? 0 : FAVORITE_BOOST - favIndex;
    return { chainId, score: base + boost, catalogIndex };
  });

  scored.sort((a, b) => b.score - a.score || a.catalogIndex - b.catalogIndex);
  return scored.slice(0, limit).map((s) => s.chainId);
}
