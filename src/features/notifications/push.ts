import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getSupabase } from '../../lib/supabase';

/**
 * Registers this device for push and stores the Expo token (SPEC Section 10).
 * Silently no-ops when permission is denied or push credentials are not yet
 * configured (Section 15 — Expo push creds are a human step).
 */
export async function registerPushToken(userId: string): Promise<boolean> {
  try {
    const permissions = await Notifications.requestPermissionsAsync();
    if (!permissions.granted) return false;
    const token = await Notifications.getExpoPushTokenAsync();
    const { error } = await getSupabase()
      .from('push_tokens')
      .upsert(
        { user_id: userId, expo_push_token: token.data, platform: Platform.OS },
        { onConflict: 'user_id,expo_push_token' },
      );
    if (error) throw error;
    return true;
  } catch {
    // Missing project credentials or simulator — fine, push stays off.
    return false;
  }
}
