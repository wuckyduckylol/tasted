import { z } from 'zod';

export const bucketSchema = z.enum(['drinks', 'sweet', 'savory']);
export type Bucket = z.infer<typeof bucketSchema>;

export const bandSchema = z.enum(['loved', 'fine', 'disliked']);
export type Band = z.infer<typeof bandSchema>;

export const comparisonOutcomeSchema = z.enum(['new_item_better', 'peer_better', 'too_close']);
export type ComparisonOutcome = z.infer<typeof comparisonOutcomeSchema>;

export const predictionSourceSchema = z.enum(['user', 'content', 'collab', 'blend', 'community']);
export type PredictionSource = z.infer<typeof predictionSourceSchema>;

/** Content-based attribute payload stored on items.attributes (jsonb). */
export const itemAttributesSchema = z.record(
  z.string(),
  z.union([z.number(), z.string(), z.boolean()]),
);
export type ItemAttributes = z.infer<typeof itemAttributesSchema>;

export interface Profile {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isPrivate: boolean;
  streakCount: number;
}

export interface Chain {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  isActive: boolean;
  displayOrder: number | null;
}

export interface Item {
  id: string;
  chainId: string;
  name: string;
  description: string | null;
  bucket: Bucket;
  imageUrl: string | null;
  attributes: ItemAttributes;
  isActive: boolean;
  isNew: boolean;
  launchedAt: string | null;
  tagSlugs: string[];
}

export interface Rating {
  id: string;
  userId: string;
  itemId: string;
  band: Band;
  wouldOrderAgain: boolean;
  personalScore: number;
  note: string | null;
  updatedAt: string;
}

export interface ItemScore {
  itemId: string;
  numRatings: number;
  meanScore: number | null;
  weightedScore: number | null;
  worthItPct: number | null;
  distLoved: number;
  distFine: number;
  distDisliked: number;
}

export interface ChainCandidate {
  id: string;
  name: string;
  logoUrl: string | null;
  isUnlocked: boolean;
  voteCount: number;
}

export interface Prediction {
  score: number;
  source: PredictionSource;
  confidence: number;
  lowConfidence: boolean;
}
