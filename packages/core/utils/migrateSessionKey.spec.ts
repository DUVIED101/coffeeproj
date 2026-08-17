import { describe, it, expect, beforeEach } from '@jest/globals';
import { LEGACY_SESSION_KEY, migrateSessionKey, NEW_SESSION_KEY } from './migrateSessionKey';
import { setPlatform, _resetPlatformForTests } from '../platform';
import { createTestPlatform } from '../platform/testing';

let storageStore: Map<string, string>;

beforeEach(() => {
  _resetPlatformForTests();
  const { platform, storageStore: store } = createTestPlatform();
  storageStore = store;
  setPlatform(platform);
});

describe('migrateSessionKey', () => {
  it('copies legacy session value to the new stable key when only legacy exists', async () => {
    storageStore.set(LEGACY_SESSION_KEY, '{"access_token":"abc"}');

    await migrateSessionKey();

    expect(storageStore.get(NEW_SESSION_KEY)).toBe('{"access_token":"abc"}');
  });

  it('preserves the legacy key after migration (rollback safety)', async () => {
    storageStore.set(LEGACY_SESSION_KEY, '{"access_token":"abc"}');

    await migrateSessionKey();

    expect(storageStore.get(LEGACY_SESSION_KEY)).toBe('{"access_token":"abc"}');
  });

  it('does not overwrite an existing new-key value (idempotent re-runs)', async () => {
    storageStore.set(LEGACY_SESSION_KEY, '{"access_token":"old"}');
    storageStore.set(NEW_SESSION_KEY, '{"access_token":"new"}');

    await migrateSessionKey();

    expect(storageStore.get(NEW_SESSION_KEY)).toBe('{"access_token":"new"}');
  });

  it('is a no-op when no legacy key exists (fresh install)', async () => {
    await migrateSessionKey();
    expect(storageStore.get(NEW_SESSION_KEY)).toBeUndefined();
    expect(storageStore.get(LEGACY_SESSION_KEY)).toBeUndefined();
  });

  it('is a no-op when only the new key exists (already migrated)', async () => {
    storageStore.set(NEW_SESSION_KEY, '{"access_token":"new"}');

    await migrateSessionKey();

    expect(storageStore.get(NEW_SESSION_KEY)).toBe('{"access_token":"new"}');
    expect(storageStore.get(LEGACY_SESSION_KEY)).toBeUndefined();
  });

  it('LEGACY_SESSION_KEY matches the pre-Phase8.6 default supabase-js storage key', () => {
    // supabase-js v2 default: sb-<projectRef>-auth-token. Pre-Phase8.6 the
    // ref was derived from SUPABASE_URL (zifvfsamfzepxxuxhyhg.supabase.co).
    expect(LEGACY_SESSION_KEY).toBe('sb-zifvfsamfzepxxuxhyhg-auth-token');
  });
});
