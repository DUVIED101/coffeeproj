import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';

export function projectRefFromUrl(url: string): string | null {
  const match = url.match(/^https?:\/\/([^./]+)\.supabase\.co/i);
  return match ? match[1] : null;
}

export function cachedSessionStorageKey(supabaseUrl: string): string | null {
  const ref = projectRefFromUrl(supabaseUrl);
  return ref ? `sb-${ref}-auth-token` : null;
}

export async function readCachedSession(supabaseUrl: string): Promise<Session | null> {
  const key = cachedSessionStorageKey(supabaseUrl);
  if (!key) return null;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const p = parsed as Record<string, unknown>;
    if (
      typeof p.access_token === 'string' &&
      typeof p.refresh_token === 'string' &&
      p.user &&
      typeof p.user === 'object'
    ) {
      return p as unknown as Session;
    }
    return null;
  } catch {
    return null;
  }
}
