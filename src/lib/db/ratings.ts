import { getSupabase } from '../supabase';
import { mapItem, mapRating, type ItemRowWithTags } from './mappers';
import type { Band, Bucket, Item, Rating } from '../../types/domain';

export async function listMyRatings(userId: string): Promise<Rating[]> {
  const { data, error } = await getSupabase()
    .from('ratings')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data.map(mapRating);
}

export interface RatingWithItem {
  rating: Rating;
  item: Item;
}

/** Ratings joined with their catalog items — one query, no N+1 (SPEC 12.4). */
export async function listMyRatingsWithItems(userId: string): Promise<RatingWithItem[]> {
  const { data, error } = await getSupabase()
    .from('ratings')
    .select('*, items(*, item_tags(tags(slug)))')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data.flatMap((row) => {
    const { items: itemRow, ...ratingRow } = row;
    if (!itemRow) return [];
    return [{ rating: mapRating(ratingRow), item: mapItem(itemRow as ItemRowWithTags) }];
  });
}

export async function getMyRatingForItem(userId: string, itemId: string): Promise<Rating | null> {
  const { data, error } = await getSupabase()
    .from('ratings')
    .select('*')
    .eq('user_id', userId)
    .eq('item_id', itemId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRating(data) : null;
}

export interface UpsertRatingInput {
  userId: string;
  itemId: string;
  band: Band;
  wouldOrderAgain: boolean;
  personalScore: number;
  note: string | null;
}

export async function upsertRating(input: UpsertRatingInput): Promise<Rating> {
  const { data, error } = await getSupabase()
    .from('ratings')
    .upsert(
      {
        user_id: input.userId,
        item_id: input.itemId,
        band: input.band,
        would_order_again: input.wouldOrderAgain,
        personal_score: input.personalScore,
        note: input.note,
      },
      { onConflict: 'user_id,item_id' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return mapRating(data);
}

/** Applies re-interpolated scores for a whole band atomically (RPC, SPEC 5.1). */
export async function applyBandScores(
  bucket: Bucket,
  band: Band,
  scoresByItemId: Record<string, number>,
): Promise<void> {
  const { error } = await getSupabase().rpc('replace_band_rankings', {
    p_bucket: bucket,
    p_band: band,
    p_scores: scoresByItemId,
  });
  if (error) throw error;
}

export interface ComparisonLog {
  userId: string;
  bucket: Bucket;
  band: Band;
  itemA: string;
  itemB: string;
  winnerItemId: string | null;
}

export async function logComparisons(logs: ComparisonLog[]): Promise<void> {
  if (logs.length === 0) return;
  const { error } = await getSupabase().from('comparisons').insert(
    logs.map((log) => ({
      user_id: log.userId,
      bucket: log.bucket,
      band: log.band,
      item_a: log.itemA,
      item_b: log.itemB,
      winner_item_id: log.winnerItemId,
    })),
  );
  if (error) throw error;
}
