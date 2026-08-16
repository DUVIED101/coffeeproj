import { SUPABASE_ANON_KEY } from '@env';
import { SUPABASE_URL } from '../config/supabase';

// Fires a tiny HEAD request to Supabase so the TLS/HTTP-2 connection is
// established BEFORE the first auth/data fetch lands. On cold-start, the
// first real fetch otherwise pays the full handshake cost (~200ms-2s
// depending on RTT and proxy state). Pre-warming runs alongside
// migrateSessionKey/initI18n, so by the time authStore.initialize calls
// supabase.auth → fetchUserProfile, the connection pool is hot and the
// subsequent burst of parallel screen-load queries can multiplex over the
// same h2 stream instead of opening a fresh socket each.

let warmupStarted = false;

export function warmSupabaseConnection(): void {
  if (warmupStarted) return;
  warmupStarted = true;
  fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'HEAD',
    headers: { apikey: SUPABASE_ANON_KEY },
  }).catch(() => {
    // best-effort — real requests surface their own errors
  });
}
