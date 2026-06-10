import AsyncStorage from '@react-native-async-storage/async-storage';
import { LEGACY_SESSION_KEY, migrateSessionKey, NEW_SESSION_KEY } from './migrateSessionKey';

describe('migrateSessionKey', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('copies legacy session value to the new stable key when only legacy exists', async () => {
    await AsyncStorage.setItem(LEGACY_SESSION_KEY, '{"access_token":"abc"}');

    await migrateSessionKey();

    const migrated = await AsyncStorage.getItem(NEW_SESSION_KEY);
    expect(migrated).toBe('{"access_token":"abc"}');
  });

  it('preserves the legacy key after migration (rollback safety)', async () => {
    await AsyncStorage.setItem(LEGACY_SESSION_KEY, '{"access_token":"abc"}');

    await migrateSessionKey();

    const legacy = await AsyncStorage.getItem(LEGACY_SESSION_KEY);
    expect(legacy).toBe('{"access_token":"abc"}');
  });

  it('does not overwrite an existing new-key value (idempotent re-runs)', async () => {
    await AsyncStorage.setItem(LEGACY_SESSION_KEY, '{"access_token":"old"}');
    await AsyncStorage.setItem(NEW_SESSION_KEY, '{"access_token":"new"}');

    await migrateSessionKey();

    expect(await AsyncStorage.getItem(NEW_SESSION_KEY)).toBe('{"access_token":"new"}');
  });

  it('is a no-op when no legacy key exists (fresh install)', async () => {
    await migrateSessionKey();
    expect(await AsyncStorage.getItem(NEW_SESSION_KEY)).toBeNull();
    expect(await AsyncStorage.getItem(LEGACY_SESSION_KEY)).toBeNull();
  });

  it('is a no-op when only the new key exists (already migrated)', async () => {
    await AsyncStorage.setItem(NEW_SESSION_KEY, '{"access_token":"new"}');

    await migrateSessionKey();

    expect(await AsyncStorage.getItem(NEW_SESSION_KEY)).toBe('{"access_token":"new"}');
    expect(await AsyncStorage.getItem(LEGACY_SESSION_KEY)).toBeNull();
  });

  it('LEGACY_SESSION_KEY matches the pre-Phase8.6 default supabase-js storage key', () => {
    // supabase-js v2 default: sb-<projectRef>-auth-token. Pre-Phase8.6 the
    // ref was derived from SUPABASE_URL (zifvfsamfzepxxuxhyhg.supabase.co).
    expect(LEGACY_SESSION_KEY).toBe('sb-zifvfsamfzepxxuxhyhg-auth-token');
  });
});
