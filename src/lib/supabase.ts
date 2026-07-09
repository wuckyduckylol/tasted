import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { config, isSupabaseConfigured } from './config';
import type { Database } from '../types/database';

let client: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Copy .env.example to .env and fill in your project values.',
    );
  }
  if (!client) {
    client = createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        // supabase-js defaults to localStorage on web.
        ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        // PKCE lets the native OAuth flow exchange the returned code for a session.
        flowType: 'pkce',
      },
    });
  }
  return client;
}
