import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY } from '@env';
import { initSupabase } from '@bystrobarista/core/config/supabase';
import { STABLE_STORAGE_KEY } from '@bystrobarista/core/config/authStorage';
import { pickSupabaseHostSync } from './supabaseHost';

if (!SUPABASE_ANON_KEY) {
  throw new Error('Missing SUPABASE_ANON_KEY. Please check your .env file.');
}

export const SUPABASE_URL: string = pickSupabaseHostSync().url;

// Instantiating at module-eval time preserves the pre-Step-7 contract: any
// `import { supabase } from '../config/supabase'` gets a live client with no
// bootstrap ordering to worry about. Web will call initSupabase from its
// providers.tsx with an @supabase/ssr cookie storage instead of AsyncStorage.
export const supabase: SupabaseClient = initSupabase({
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  storage: AsyncStorage,
  storageKey: STABLE_STORAGE_KEY,
  detectSessionInUrl: false,
  flowType: 'pkce',
});
