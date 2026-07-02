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

export async function getItemScores(itemIds: string[]): Promise<Map<string, ItemScore>> {
  if (itemIds.length === 0) return new Map();
  const { data, error } = await getSupabase().from('item_scores').select('*').in('item_id', itemIds);
  if (error) throw error;
  return new Map(data.map((row) => [row.item_id, mapItemScore(row)]));
}
