import { getSupabase } from '../supabase';

export interface FollowCounts {
  followers: number;
  following: number;
}

export async function getFollowCounts(userId: string): Promise<FollowCounts> {
  const supabase = getSupabase();
  const [followers, following] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);
  if (followers.error) throw followers.error;
  if (following.error) throw following.error;
  return { followers: followers.count ?? 0, following: following.count ?? 0 };
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from('follows')
    .select('follower_id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function setFollowing(
  followerId: string,
  followingId: string,
  follow: boolean,
): Promise<void> {
  const supabase = getSupabase();
  if (follow) {
    const { error } = await supabase
      .from('follows')
      .upsert({ follower_id: followerId, following_id: followingId }, { onConflict: 'follower_id,following_id' });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);
    if (error) throw error;
  }
}
