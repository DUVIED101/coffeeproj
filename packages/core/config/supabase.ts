import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// A storage-shaped object matching what @supabase/supabase-js expects for
// auth.storage. We accept the loose supabase-js shape rather than our
// StorageAdapter interface so that mobile can pass AsyncStorage untouched
// (getItem/setItem/removeItem are compatible) and web can pass an
// @supabase/ssr cookie-storage adapter without adapter wrappers.
type SupabaseAuthStorage = {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
};

export type SupabaseConfig = {
  url: string;
  anonKey: string;
  storage: SupabaseAuthStorage;
  storageKey: string;
  // Web needs `true` for the magic-link / OAuth callback flow (supabase-js
  // reads the hash fragment on load). Mobile hands us tokens via native
  // SDKs, so it always passes `false`.
  detectSessionInUrl?: boolean;
  flowType?: 'pkce' | 'implicit';
};

let _client: SupabaseClient | null = null;

// Instantiates the singleton and returns it. Must be called once at bootstrap
// (mobile: apps/mobile/src/config/supabase.ts at module-eval time; web: a
// providers.tsx effect). Subsequent calls throw to catch accidental
// re-initialisation with a different URL/key.
export const initSupabase = (config: SupabaseConfig): SupabaseClient => {
  if (_client) {
    throw new Error('initSupabase called twice. Only one Supabase client per app process.');
  }
  _client = createClient(config.url, config.anonKey, {
    auth: {
      storage: config.storage,
      storageKey: config.storageKey,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: config.detectSessionInUrl ?? false,
      // Force PKCE for magic-link / password-reset / email-confirmation
      // handshakes. Without it, older supabase-js can fall back to implicit
      // flow — an intercepted authorization code becomes redeemable by
      // anyone. PKCE adds a per-session verifier that only our app knows.
      flowType: config.flowType ?? 'pkce',
    },
  });
  return _client;
};

export const getSupabase = (): SupabaseClient => {
  if (!_client) {
    throw new Error('Supabase not initialised. Call initSupabase() before touching the client.');
  }
  return _client;
};

// Test-only reset. Must not be called in production.
export const _resetSupabaseForTests = (): void => {
  _client = null;
};
