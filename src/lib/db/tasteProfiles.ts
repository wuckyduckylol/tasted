import { getSupabase } from '../supabase';
import type { FeatureVector } from '../scoring';

export async function upsertTasteProfile(userId: string, weights: FeatureVector): Promise<void> {
  const { error } = await getSupabase()
    .from('taste_profiles')
    .upsert(
      { user_id: userId, attribute_weights: weights, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  if (error) throw error;
}

export async function getTasteProfile(userId: string): Promise<FeatureVector> {
  const { data, error } = await getSupabase()
    .from('taste_profiles')
    .select('attribute_weights')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  const weights = data?.attribute_weights;
  if (!weights || typeof weights !== 'object' || Array.isArray(weights)) return {};
  const out: FeatureVector = {};
  for (const [key, value] of Object.entries(weights)) {
    if (typeof value === 'number' && Number.isFinite(value)) out[key] = value;
  }
  return out;
}
