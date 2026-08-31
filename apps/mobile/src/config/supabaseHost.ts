import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL, SUPABASE_PROXY_URL } from '@env';
import { STABLE_STORAGE_KEY } from '@bystrobarista/core/config/authStorage';
import {
  computeHostChoice,
  getDeviceTimezone,
  isRussianTimezone,
  RU_TIMEZONES,
  type HostChoice,
  type HostChoiceReason,
} from '@bystrobarista/core/config/hostPick';

export const DIRECT_URL: string = SUPABASE_URL;
export const PROXY_URL: string | undefined = SUPABASE_PROXY_URL || undefined;

// Re-exported for callers that import these from here — canonical definitions
// live in core so web/mobile agree on the session key and the RU host pick.
export { STABLE_STORAGE_KEY, RU_TIMEZONES, isRussianTimezone, getDeviceTimezone };
export type { HostChoice, HostChoiceReason };

export const FORCE_PROXY_STORAGE_KEY = 'diagnostics.forceProxy';

// Synchronous host pick — used at supabase client init when AsyncStorage
// isn't reachable. Honours device timezone only. The Force-proxy override is
// applied through pickSupabaseHost (async) at app bootstrap, before the
// client is created.
//
// Production callers omit `opts` and get the first compute cached forever, so
// the supabase client and DiagnosticScreen always report the same URL. Tests
// pass `opts.timezone` explicitly and bypass the cache.
let _cachedChoice: HostChoice | null = null;

export function pickSupabaseHostSync(opts?: { timezone?: string | null }): HostChoice {
  if (opts && 'timezone' in opts) {
    return computeHostChoice({ directUrl: DIRECT_URL, proxyUrl: PROXY_URL, timezone: opts.timezone });
  }
  if (_cachedChoice) return _cachedChoice;
  _cachedChoice = computeHostChoice({
    directUrl: DIRECT_URL,
    proxyUrl: PROXY_URL,
    timezone: getDeviceTimezone(),
  });
  return _cachedChoice;
}

// Test-only: reset the cached choice so each test re-evaluates getDeviceTimezone.
export function _resetSyncCacheForTests(): void {
  _cachedChoice = null;
}

export async function pickSupabaseHost(opts?: { timezone?: string | null }): Promise<HostChoice> {
  if (!PROXY_URL) return { url: DIRECT_URL, useProxy: false, reason: 'default' };
  try {
    const forced = await AsyncStorage.getItem(FORCE_PROXY_STORAGE_KEY);
    if (forced === 'true') return { url: PROXY_URL, useProxy: true, reason: 'forced' };
  } catch {
    // AsyncStorage failure — fall through to TZ logic.
  }
  const tz = opts && 'timezone' in opts ? opts.timezone : getDeviceTimezone();
  if (isRussianTimezone(tz)) return { url: PROXY_URL, useProxy: true, reason: 'tz' };
  return { url: DIRECT_URL, useProxy: false, reason: 'default' };
}
