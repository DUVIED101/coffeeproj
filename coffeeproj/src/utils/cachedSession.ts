import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { STABLE_STORAGE_KEY } from '../config/supabaseHost';

export const CACHED_SESSION_STORAGE_KEY = STABLE_STORAGE_KEY;

export async function readCachedSession(): Promise<Session | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHED_SESSION_STORAGE_KEY);
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
