import { getSupabase } from '../supabase';
import { mapItemScore } from './mappers';
import type { ItemScore } from '../../types/domain';

export async function getItemScore(itemId: string): Promise<ItemScore | null> {
  const { data, error } = await getSupabase()
    .from('item_scores')
    .select('*')
    .eq('item_id', itemId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapItemScore(data) : null;
}

/**
 * Community score rows per active item, keyed to chains — input for the
 * pure chain aggregation in src/lib/scoring/topChains.ts.
 */
export async function listChainScoreRows(): Promise<
  { chainId: string; weightedScore: number | null; ratingCount: number }[]
> {
  const { data, error } = await getSupabase()
    .from('items')
    .select('chain_id, item_scores(weighted_score, num_ratings)')
    .eq('is_active', true);
  if (error) throw error;
  return data.map((row) => {
    const score = Array.isArray(row.item_scores) ? row.item_scores[0] : row.item_scores;
    return {
      chainId: row.chain_id as string,
      weightedScore: (score?.weighted_score as number | null) ?? null,
      ratingCount: (score?.num_ratings as number | null) ?? 0,
    };
  });
}

export async function getItemScores(itemIds: string[]): Promise<Map<string, ItemScore>> {
  if (itemIds.length === 0) return new Map();
  const { data, error } = await getSupabase().from('item_scores').select('*').in('item_id', itemIds);
  if (error) throw error;
  return new Map(data.map((row) => [row.item_id, mapItemScore(row)]));
}
