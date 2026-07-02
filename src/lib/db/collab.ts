import { getSupabase } from '../supabase';
import type { Band } from '../../types/domain';

export interface CollabPrediction {
  score: number;
  neighbors: number;
}

/** Server-computed neighbor predictions (SPEC 5.4); empty until similarity data exists. */
export async function getCollabPredictions(itemIds: string[]): Promise<Map<string, CollabPrediction>> {
  if (itemIds.length === 0) return new Map();
  const { data, error } = await getSupabase().rpc('collab_predictions', { p_item_ids: itemIds });
  if (error) throw error;
  return new Map(
    (data ?? []).map((row) => [
      row.item_id,
      { score: Number(row.predicted_score), neighbors: row.neighbors },
    ]),
  );
}

export interface FriendRating {
  userId: string;
  username: string;
  itemId: string;
  itemName: string;
  band: Band;
  personalScore: number;
  ratedAt: string;
}

export async function getFriendsRecentRatings(limit = 20): Promise<FriendRating[]> {
  const { data, error } = await getSupabase().rpc('friends_recent_ratings', { p_limit: limit });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    userId: row.user_id,
    username: row.username,
    itemId: row.item_id,
    itemName: row.item_name,
    band: row.band as Band,
    personalScore: Number(row.personal_score),
    ratedAt: row.rated_at,
  }));
}

export interface FoundProfile {
  id: string;
  username: string;
  displayName: string | null;
  isPrivate: boolean;
}

export async function findProfileByUsername(username: string): Promise<FoundProfile | null> {
  const { data, error } = await getSupabase().rpc('find_profile_by_username', {
    p_username: username,
  });
  if (error) throw error;
  const row = (data ?? [])[0];
  return row
    ? { id: row.id, username: row.username, displayName: row.display_name, isPrivate: row.is_private }
    : null;
}
