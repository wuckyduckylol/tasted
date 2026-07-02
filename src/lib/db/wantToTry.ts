import { getSupabase } from '../supabase';

export async function isWanted(userId: string, itemId: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from('want_to_try')
    .select('item_id')
    .eq('user_id', userId)
    .eq('item_id', itemId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function setWanted(userId: string, itemId: string, wanted: boolean): Promise<void> {
  const supabase = getSupabase();
  if (wanted) {
    const { error } = await supabase
      .from('want_to_try')
      .upsert({ user_id: userId, item_id: itemId }, { onConflict: 'user_id,item_id' });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('want_to_try')
      .delete()
      .eq('user_id', userId)
      .eq('item_id', itemId);
    if (error) throw error;
  }
}

export async function listWantedItemIds(userId: string): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from('want_to_try')
    .select('item_id')
    .eq('user_id', userId);
  if (error) throw error;
  return data.map((row) => row.item_id);
}
