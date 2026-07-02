import Constants from 'expo-constants';
import { z } from 'zod';

const extraSchema = z.object({
  supabaseUrl: z.string().default(''),
  supabaseAnonKey: z.string().default(''),
});

const extra = extraSchema.parse(Constants.expoConfig?.extra ?? {});

export const config = {
  supabaseUrl: extra.supabaseUrl,
  supabaseAnonKey: extra.supabaseAnonKey,
} as const;

/**
 * True once the human has populated .env (SPEC.md Section 15). The app boots
 * without it but all data screens show a "backend not configured" state.
 */
export const isSupabaseConfigured =
  config.supabaseUrl.length > 0 && config.supabaseAnonKey.length > 0;

/** Tunables from SPEC.md Section 5. Keep in sync with supabase/migrations. */
export const scoringConfig = {
  /** Bayesian prior weight m (Section 5.2). */
  bayesianM: 10,
  /** Below this many ratings an item shows "score forming" (Section 5.2). */
  minRatingsToShowScore: 5,
  /** Hard cap on head-to-head comparisons per rating (Section 5.1). */
  maxComparisons: 4,
  /** Ratings needed before personalized predictions replace community numbers (Section 5.5). */
  minRatingsForPersonalization: 5,
  confidenceThreshold: 0.3,
  /** Max ratings per user per hour (Section 5.6). */
  ratingsPerHourLimit: 30,
} as const;
