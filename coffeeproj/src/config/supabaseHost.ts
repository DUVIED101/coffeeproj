import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL, SUPABASE_PROXY_URL } from '@env';

export const DIRECT_URL: string = SUPABASE_URL;
export const PROXY_URL: string | undefined = SUPABASE_PROXY_URL || undefined;

// Stable supabase-js auth storage key. supabase-js defaults to
// `sb-<projectRef>-auth-token`, derived from supabaseUrl — which means
// swapping the URL between direct and proxy hosts would log everyone out.
// Pinning to a project-stable name decouples the session from the URL.
export const STABLE_STORAGE_KEY = 'sb-bystrobarista-auth-token';
export const FORCE_PROXY_STORAGE_KEY = 'diagnostics.forceProxy';

// IANA zone names for every Russian time band (Europe/* west of Urals,
// Asia/* east). Kept as a Set for O(1) lookup. Aliases like Europe/Volgograd
// and Asia/Khandyga are included so devices on older tzdata still match.
export const RU_TIMEZONES: ReadonlySet<string> = new Set<string>([
  'Europe/Astrakhan',
  'Europe/Kaliningrad',
  'Europe/Kirov',
  'Europe/Moscow',
  'Europe/Samara',
  'Europe/Saratov',
  'Europe/Simferopol',
  'Europe/Ulyanovsk',
  'Europe/Volgograd',
  'Asia/Anadyr',
  'Asia/Barnaul',
  'Asia/Chita',
  'Asia/Irkutsk',
  'Asia/Kamchatka',
  'Asia/Khandyga',
  'Asia/Krasnoyarsk',
  'Asia/Magadan',
  'Asia/Novokuznetsk',
  'Asia/Novosibirsk',
  'Asia/Omsk',
  'Asia/Sakhalin',
  'Asia/Srednekolymsk',
  'Asia/Tomsk',
  'Asia/Ust-Nera',
  'Asia/Vladivostok',
  'Asia/Yakutsk',
  'Asia/Yekaterinburg',
]);

export function isRussianTimezone(tz: string | null | undefined): boolean {
  return typeof tz === 'string' && RU_TIMEZONES.has(tz);
}

export function getDeviceTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

export type HostChoiceReason = 'forced' | 'tz' | 'default';

export type HostChoice = {
  url: string;
  useProxy: boolean;
  reason: HostChoiceReason;
};

function directChoice(): HostChoice {
  return { url: DIRECT_URL, useProxy: false, reason: 'default' };
}

function proxyChoice(reason: 'forced' | 'tz'): HostChoice {
  // Should never be called when PROXY_URL is undefined — callers gate on it.
  return { url: PROXY_URL as string, useProxy: true, reason };
}

// Synchronous host pick — used at supabase client init when AsyncStorage
// isn't reachable. Honours device timezone only. The Force-proxy override is
// applied through pickSupabaseHost (async) at app bootstrap, before the
// client is created.
//
// Production callers omit `opts` and get the first compute cached forever, so
// the supabase client and DiagnosticScreen always report the same URL. Tests
// pass `opts.timezone` explicitly and bypass the cache.
let _cachedChoice: HostChoice | null = null;

function computeSyncChoice(tz: string | null | undefined): HostChoice {
  if (!PROXY_URL) return directChoice();
  if (isRussianTimezone(tz)) return proxyChoice('tz');
  // Hermes' Intl polyfill on iOS can return null/'UTC' if it hasn't finished
  // initializing when supabase.ts evaluates at bundle time. Treat unreliable
  // TZ as "probably Russian" — false-positive proxy costs ~100ms for non-RU
  // users, false-negative direct means the app hangs entirely for RU users.
  if (!tz || tz === 'UTC') return proxyChoice('tz');
  // Offset-based fallback for devices that report a non-canonical TZ name
  // (e.g. legacy aliases like 'W-SU', or 'GMT+3' on some Hermes builds) but
  // sit in the Russian UTC offset band (Moscow UTC+3 → Kamchatka UTC+12).
  // getTimezoneOffset returns minutes WEST of UTC, so RU offsets are negative.
  // We allow false-positives in this band (Istanbul, Dubai, Tashkent) — the
  // extra hop costs ~100ms vs the app failing entirely for RU users with
  // garbled Intl output.
  const offsetMinutes = new Date().getTimezoneOffset();
  if (offsetMinutes <= -120 && offsetMinutes >= -720) return proxyChoice('tz');
  return directChoice();
}

export function pickSupabaseHostSync(opts?: { timezone?: string | null }): HostChoice {
  if (opts && 'timezone' in opts) return computeSyncChoice(opts.timezone);
  if (_cachedChoice) return _cachedChoice;
  _cachedChoice = computeSyncChoice(getDeviceTimezone());
  return _cachedChoice;
}

// Test-only: reset the cached choice so each test re-evaluates getDeviceTimezone.
export function _resetSyncCacheForTests(): void {
  _cachedChoice = null;
}

export async function pickSupabaseHost(opts?: { timezone?: string | null }): Promise<HostChoice> {
  if (!PROXY_URL) return directChoice();
  try {
    const forced = await AsyncStorage.getItem(FORCE_PROXY_STORAGE_KEY);
    if (forced === 'true') return proxyChoice('forced');
  } catch {
    // AsyncStorage failure — fall through to TZ logic.
  }
  const tz = opts && 'timezone' in opts ? opts.timezone : getDeviceTimezone();
  if (isRussianTimezone(tz)) return proxyChoice('tz');
  return directChoice();
}
