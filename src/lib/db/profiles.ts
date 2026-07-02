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
