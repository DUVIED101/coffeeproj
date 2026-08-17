import { getPlatform } from '../platform';
import { STABLE_STORAGE_KEY } from '../config/authStorage';

export const LEGACY_SESSION_KEY = 'sb-zifvfsamfzepxxuxhyhg-auth-token';
export const NEW_SESSION_KEY = STABLE_STORAGE_KEY;

// One-time copy from legacy → stable key. Idempotent: safe to call on every
// boot. The legacy key is **intentionally not deleted** for one release as a
// rollback safety net — supabase-js will only ever read the stable key after
// we pass `storageKey` explicitly to createClient.
export async function migrateSessionKey(): Promise<void> {
  const storage = getPlatform().storage;
  try {
    const [legacy, current] = await Promise.all([
      storage.getItem(LEGACY_SESSION_KEY),
      storage.getItem(NEW_SESSION_KEY),
    ]);
    if (legacy && !current) {
      await storage.setItem(NEW_SESSION_KEY, legacy);
    }
  } catch {
    // Storage failure here is non-fatal: worst case the user re-logs in.
  }
}
