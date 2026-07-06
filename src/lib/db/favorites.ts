import { getSupabase } from '../supabase';

/** Replaces the user's top-3 favorite chains; `chainIds` is pick order (rank 1 first). */
export async function saveFavoriteChains(userId: string, chainIds: string[]): Promise<void> {
  const supabase = getSupabase();
  const { error: deleteError } = await supabase
    .from('user_favorite_chains')
    .delete()
    .eq('user_id', userId);
  if (deleteError) throw deleteError;

  const rows = chainIds.slice(0, 3).map((chainId, i) => ({
    user_id: userId,
    chain_id: chainId,
    rank: i + 1,
  }));
  if (rows.length === 0) return;
  const { error } = await supabase.from('user_favorite_chains').insert(rows);
  if (error) throw error;
}

/** The user's favorite chain ids in rank order (may be empty). */
export async function listMyFavoriteChainIds(userId: string): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from('user_favorite_chains')
    .select('chain_id, rank')
    .eq('user_id', userId)
    .order('rank');
  if (error) throw error;
  return data.map((row) => row.chain_id as string);
}
