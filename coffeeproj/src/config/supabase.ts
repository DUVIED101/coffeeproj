import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_ANON_KEY } from '@env';
import { pickSupabaseHostSync, STABLE_STORAGE_KEY } from './supabaseHost';

if (!SUPABASE_ANON_KEY) {
  throw new Error('Missing SUPABASE_ANON_KEY. Please check your .env file.');
}

// Single client, created synchronously at module load. URL is picked by
// pickSupabaseHostSync (TZ-based — RU timezones go to the proxy, everyone
// else goes direct). The Force-proxy diagnostic toggle requires a cold
// restart to take effect; it cannot influence this sync init because
// AsyncStorage is async-only.
//
// Phase 8.6 Phase 2 history: we previously wrapped the client in a Proxy
// with lazy init so the bootstrap could pick the URL after reading the
// async Force-proxy flag. That broke `supabase.auth.onAuthStateChange(...)`
// when registered at module load — the listener attached to a lazy-init
// client, then the bootstrap replaced the underlying client, and events
// fired on the new client never reached the listener. UI stayed stuck on
// "creating profile" / "sign in" spinners forever. Removing the Proxy and
// committing to a single sync URL fixed it.
export const SUPABASE_URL: string = pickSupabaseHostSync().url;

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    // Stable storage key (Phase 8.6 Phase 2): supabase-js's default
    // `sb-<projectRef>-auth-token` would change every time the URL swaps
    // between direct and proxy hosts, logging users out. Pinning here
    // decouples the session from the supabaseUrl.
    storageKey: STABLE_STORAGE_KEY,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Force PKCE flow for the magic-link / password-reset / email
    // confirmation handshakes. Without this, supabase-js defaults can fall
    // back to the implicit flow on older versions — meaning the
    // authorization code from the email deep link can be redeemed by anyone
    // who intercepts it (rogue app handling the same URL scheme, MITM in a
    // hostile network). PKCE adds a per-session verifier that only our app
    // knows, so an intercepted code is useless. Native OAuth providers
    // (Apple / Google / Yandex) bypass this since they hand us identity
    // tokens directly via their SDKs.
    flowType: 'pkce',
  },
});
