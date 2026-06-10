import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_ANON_KEY } from '@env';
import { pickSupabaseHostSync, STABLE_STORAGE_KEY } from './supabaseHost';

if (!SUPABASE_ANON_KEY) {
  throw new Error('Missing SUPABASE_ANON_KEY. Please check your .env file.');
}

let _client: SupabaseClient | null = null;
let _activeUrl: string | null = null;

function buildClient(url: string): SupabaseClient {
  return createClient(url, SUPABASE_ANON_KEY, {
    auth: {
      storage: AsyncStorage,
      // Stable storage key (Phase 8.6 Phase 2): supabase-js's default
      // `sb-<projectRef>-auth-token` would change every time we swap between
      // the direct and proxy URLs, logging users out. Pinning the key here
      // decouples the session from the supabaseUrl.
      storageKey: STABLE_STORAGE_KEY,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

// Bootstrap-explicit init. App.tsx calls this **after** migrateSessionKey()
// and pickSupabaseHost() resolve, so the chosen URL fully accounts for the
// Force-proxy override + Russian timezone heuristic.
export function initSupabase(url: string): SupabaseClient {
  if (_client && _activeUrl === url) return _client;
  _client = buildClient(url);
  _activeUrl = url;
  return _client;
}

// Eager fallback for callsites that touch `supabase` before App.tsx has had
// a chance to bootstrap (e.g. an unexpected synchronous import path). Uses
// the sync TZ-only host picker; Force-proxy override won't apply here. This
// keeps the app from crashing in edge cases but should never be the primary
// init path.
function lazyInit(): SupabaseClient {
  const { url } = pickSupabaseHostSync();
  return initSupabase(url);
}

export function getSupabase(): SupabaseClient {
  return _client ?? lazyInit();
}

// Backwards-compatible export. Existing `import { supabase } from '...'`
// callsites keep working — the Proxy lazily initializes on first property
// access and binds methods to the underlying client so chained calls behave
// identically to a direct supabase-js client.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabase();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function'
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value;
  },
});
