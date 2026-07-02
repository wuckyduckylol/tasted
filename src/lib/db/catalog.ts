import { getSupabase } from '../supabase';
import { mapChain, mapItem, type ItemRowWithTags } from './mappers';
import type { Chain, Item } from '../../types/domain';

const ITEM_WITH_TAGS = '*, item_tags(tags(slug))';

export async function listActiveChains(): Promise<Chain[]> {
  const { data, error } = await getSupabase()
    .from('chains')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data.map(mapChain);
}

export async function getChain(chainId: string): Promise<Chain> {
  const { data, error } = await getSupabase()
    .from('chains')
    .select('*')
    .eq('id', chainId)
    .single();
  if (error) throw error;
  return mapChain(data);
}

export async function listChainItems(chainId: string): Promise<Item[]> {
  const { data, error } = await getSupabase()
    .from('items')
    .select(ITEM_WITH_TAGS)
    .eq('chain_id', chainId)
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return (data as ItemRowWithTags[]).map(mapItem);
}

export async function getItem(itemId: string): Promise<Item> {
  const { data, error } = await getSupabase()
    .from('items')
    .select(ITEM_WITH_TAGS)
    .eq('id', itemId)
    .single();
  if (error) throw error;
  return mapItem(data as ItemRowWithTags);
}

export async function getItemsByIds(itemIds: string[]): Promise<Item[]> {
  if (itemIds.length === 0) return [];
  const { data, error } = await getSupabase().from('items').select(ITEM_WITH_TAGS).in('id', itemIds);
  if (error) throw error;
  return (data as ItemRowWithTags[]).map(mapItem);
}

export async function listNewItems(): Promise<Item[]> {
  const { data, error } = await getSupabase()
    .from('items')
    .select(ITEM_WITH_TAGS)
    .eq('is_active', true)
    .eq('is_new', true)
    .order('launched_at', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data as ItemRowWithTags[]).map(mapItem);
}

export async function searchItems(query: string): Promise<Item[]> {
  const { data, error } = await getSupabase()
    .from('items')
    .select(ITEM_WITH_TAGS)
    .eq('is_active', true)
    .ilike('name', `%${query.replaceAll('%', '')}%`)
    .limit(30);
  if (error) throw error;
  return (data as ItemRowWithTags[]).map(mapItem);
}
