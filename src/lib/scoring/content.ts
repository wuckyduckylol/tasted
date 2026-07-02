import { round2 } from './bands';
import type { ItemAttributes } from '../../types/domain';

export type FeatureVector = Record<string, number>;

/**
 * Item attributes + tags → sparse feature vector (SPEC 5.3).
 * Numeric attributes pass through; strings become one-hot features;
 * booleans become 0/1; tags become one-hot `tag:` features.
 */
export function attributesToVector(attributes: ItemAttributes, tagSlugs: string[]): FeatureVector {
  const vec: FeatureVector = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      vec[`attr:${key}`] = value;
    } else if (typeof value === 'boolean') {
      vec[`attr:${key}`] = value ? 1 : 0;
    } else if (typeof value === 'string' && value.length > 0) {
      vec[`attr:${key}=${value}`] = 1;
    }
  }
  for (const slug of tagSlugs) {
    vec[`tag:${slug}`] = 1;
  }
  return vec;
}

export interface RatedVector {
  vector: FeatureVector;
  personalScore: number;
}

/**
 * Taste profile = normalized mean of item vectors weighted by (score - 5),
 * so liked items pull features positive and disliked items pull negative
 * (SPEC 5.3 buildTasteProfile). Returns {} for an empty history.
 */
export function buildTasteProfile(rated: RatedVector[]): FeatureVector {
  const sums: FeatureVector = {};
  let totalAbsWeight = 0;
  for (const { vector, personalScore } of rated) {
    const weight = personalScore - 5;
    if (weight === 0) continue;
    totalAbsWeight += Math.abs(weight);
    for (const [key, value] of Object.entries(vector)) {
      sums[key] = (sums[key] ?? 0) + weight * value;
    }
  }
  if (totalAbsWeight === 0) return {};
  const profile: FeatureVector = {};
  for (const [key, value] of Object.entries(sums)) {
    const normalized = value / totalAbsWeight;
    if (normalized !== 0) profile[key] = normalized;
  }
  return profile;
}

export function cosineSimilarity(a: FeatureVector, b: FeatureVector): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const value of Object.values(a)) normA += value * value;
  for (const value of Object.values(b)) normB += value * value;
  if (normA === 0 || normB === 0) return 0;
  for (const [key, value] of Object.entries(a)) {
    const other = b[key];
    if (other !== undefined) dot += value * other;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Content-based prediction (SPEC 5.3 predictContent): cosine in [-1,1]
 * mapped linearly to [0,10]. Returns null when the profile is empty —
 * a cold profile must not produce a personalized number (SPEC 5.5).
 */
export function predictContent(
  profile: FeatureVector,
  itemAttributes: ItemAttributes,
  tagSlugs: string[],
): number | null {
  if (Object.keys(profile).length === 0) return null;
  const sim = cosineSimilarity(profile, attributesToVector(itemAttributes, tagSlugs));
  return round2(clamp(((sim + 1) / 2) * 10, 0, 10));
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}
