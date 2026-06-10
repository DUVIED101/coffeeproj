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
export function pickSupabaseHostSync(opts?: { timezone?: string | null }): HostChoice {
  if (!PROXY_URL) return directChoice();
  const tz = opts && 'timezone' in opts ? opts.timezone : getDeviceTimezone();
  if (isRussianTimezone(tz)) return proxyChoice('tz');
  return directChoice();
}

// Async host pick — reads the Force-proxy toggle from AsyncStorage. Used by
// App.tsx bootstrap (after migrateSessionKey, before initSupabase) and by
// DiagnosticScreen to render the effective choice.
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
