import { getSupabase } from '../supabase';
import { mapProfile } from './mappers';
import type { Profile } from '../../types/domain';

export async function getMyProfile(userId: string): Promise<Profile> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return mapProfile(data);
}

/** Newest public profiles to suggest during onboarding (excludes the caller). */
export async function listSuggestedProfiles(excludeUserId: string, limit = 10): Promise<Profile[]> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('is_private', false)
    .neq('id', excludeUserId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map(mapProfile);
}

/** Username prefix/substring search over public profiles. */
export async function searchProfiles(query: string, excludeUserId: string): Promise<Profile[]> {
  const q = query.trim().replaceAll('%', '');
  if (q.length === 0) return [];
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('is_private', false)
    .neq('id', excludeUserId)
    .ilike('username', `%${q}%`)
    .limit(20);
  if (error) throw error;
  return data.map(mapProfile);
}

/**
 * Uploads a local image (expo-image-picker uri) to the avatars bucket and
 * returns its public URL. Files live under `<uid>/avatar.jpg` per RLS policy.
 */
export async function uploadAvatar(userId: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const body = await response.arrayBuffer();
  const path = `${userId}/avatar.jpg`;
  const { error } = await getSupabase()
    .storage.from('avatars')
    .upload(path, body, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  const { data } = getSupabase().storage.from('avatars').getPublicUrl(path);
  // Cache-bust: the path is stable, so stale CDN copies would linger otherwise.
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function updateMyProfile(
  userId: string,
  changes: Partial<Pick<Profile, 'displayName' | 'isPrivate' | 'avatarUrl' | 'username'>>,
): Promise<Profile> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .update({
      ...(changes.displayName !== undefined ? { display_name: changes.displayName } : {}),
      ...(changes.avatarUrl !== undefined ? { avatar_url: changes.avatarUrl } : {}),
      ...(changes.isPrivate !== undefined ? { is_private: changes.isPrivate } : {}),
      ...(changes.username !== undefined ? { username: changes.username } : {}),
    })
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return mapProfile(data);
}
