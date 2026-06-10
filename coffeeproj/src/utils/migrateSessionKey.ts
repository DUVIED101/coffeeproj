import AsyncStorage from '@react-native-async-storage/async-storage';
import { STABLE_STORAGE_KEY } from '../config/supabaseHost';

// Phase 8.6 Phase 2 swaps the live Supabase host between the direct CF-fronted
// URL and the RU proxy. supabase-js's default `sb-<projectRef>-auth-token`
// storage key is derived from the URL — so without intervention, every RU
// user would be logged out the moment they switched paths. Pre-Phase 8.6
// installs persisted the session under the project-ref key below.
export const LEGACY_SESSION_KEY = 'sb-zifvfsamfzepxxuxhyhg-auth-token';
export const NEW_SESSION_KEY = STABLE_STORAGE_KEY;

// One-time copy from legacy → stable key. Idempotent: safe to call on every
// boot. The legacy key is **intentionally not deleted** for one release as a
// rollback safety net — supabase-js will only ever read the stable key after
// we pass `storageKey` explicitly to createClient.
export async function migrateSessionKey(): Promise<void> {
  try {
    const [legacy, current] = await Promise.all([
      AsyncStorage.getItem(LEGACY_SESSION_KEY),
      AsyncStorage.getItem(NEW_SESSION_KEY),
    ]);
    if (legacy && !current) {
      await AsyncStorage.setItem(NEW_SESSION_KEY, legacy);
    }
  } catch {
    // AsyncStorage failure here is non-fatal: worst case the user re-logs in.
  }
}
