import { getSupabase } from '../supabase';
import { getItemsByIds } from './catalog';
import { getItemScores } from './scores';
import type { Item, ItemScore } from '../../types/domain';

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export async function listTags(): Promise<Tag[]> {
  const { data, error } = await getSupabase().from('tags').select('id, name, slug').order('name');
  if (error) throw error;
  return data;
}

export interface LeaderboardEntry {
  item: Item;
  score: ItemScore;
}

/**
 * Cross-chain "best of [tag]" (SPEC 5.7): items carrying the tag with at least
 * minRatings community ratings, ordered by Bayesian weighted score.
 */
export async function bestOfTag(tagSlug: string, minRatings = 5): Promise<LeaderboardEntry[]> {
  const supabase = getSupabase();
  const { data: tag, error: tagError } = await supabase
    .from('tags')
    .select('id')
    .eq('slug', tagSlug)
    .single();
  if (tagError) throw tagError;

  const { data: links, error: linkError } = await supabase
    .from('item_tags')
    .select('item_id')
    .eq('tag_id', tag.id);
  if (linkError) throw linkError;

  const itemIds = links.map((l) => l.item_id);
  const [items, scores] = await Promise.all([getItemsByIds(itemIds), getItemScores(itemIds)]);

  const itemById = new Map(items.map((i) => [i.id, i]));
  const entries: LeaderboardEntry[] = [];
  for (const [itemId, score] of scores) {
    const item = itemById.get(itemId);
    if (!item || !item.isActive) continue;
    if (score.numRatings < minRatings || score.weightedScore === null) continue;
    entries.push({ item, score });
  }
  return entries.sort((a, b) => (b.score.weightedScore ?? 0) - (a.score.weightedScore ?? 0));
}
