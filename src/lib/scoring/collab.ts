import { round2 } from './bands';
import { clamp } from './content';

/**
 * Pearson correlation over co-rated items (SPEC 5.4 computeSimilarity).
 * Returns null when fewer than 3 common items or when either side has
 * zero variance (correlation undefined).
 */
export function pearsonSimilarity(scoresA: number[], scoresB: number[]): number | null {
  if (scoresA.length !== scoresB.length || scoresA.length < 3) return null;
  const n = scoresA.length;
  const meanA = scoresA.reduce((s, x) => s + x, 0) / n;
  const meanB = scoresB.reduce((s, x) => s + x, 0) / n;
  let cov = 0;
  let varA = 0;
  let varB = 0;
  for (let i = 0; i < n; i++) {
    const da = scoresA[i] - meanA;
    const db = scoresB[i] - meanB;
    cov += da * db;
    varA += da * da;
    varB += db * db;
  }
  if (varA === 0 || varB === 0) return null;
  return clamp(cov / Math.sqrt(varA * varB), -1, 1);
}

export interface NeighborRating {
  similarity: number;
  personalScore: number;
}

/**
 * Similarity-weighted neighbor average (SPEC 5.4 predictCollab).
 * Neighbors at or below the similarity threshold are ignored; returns null
 * when none qualify.
 */
export function predictCollab(neighbors: NeighborRating[], similarityThreshold = 0.2): number | null {
  const usable = neighbors.filter((n) => n.similarity > similarityThreshold);
  if (usable.length === 0) return null;
  let weightSum = 0;
  let scoreSum = 0;
  for (const n of usable) {
    weightSum += n.similarity;
    scoreSum += n.similarity * n.personalScore;
  }
  if (weightSum === 0) return null;
  return round2(clamp(scoreSum / weightSum, 0, 10));
}
