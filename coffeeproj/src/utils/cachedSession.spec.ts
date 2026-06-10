import AsyncStorage from '@react-native-async-storage/async-storage';
import { CACHED_SESSION_STORAGE_KEY, readCachedSession } from './cachedSession';
import { STABLE_STORAGE_KEY } from '../config/supabaseHost';

describe('CACHED_SESSION_STORAGE_KEY', () => {
  it('reuses the project-stable supabase storage key', () => {
    expect(CACHED_SESSION_STORAGE_KEY).toBe(STABLE_STORAGE_KEY);
  });
});

describe('readCachedSession', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns null when no entry exists', async () => {
    expect(await readCachedSession()).toBeNull();
  });

  it('returns null when the entry is malformed JSON', async () => {
    await AsyncStorage.setItem(CACHED_SESSION_STORAGE_KEY, '{not json');
    expect(await readCachedSession()).toBeNull();
  });

  it('returns null when required fields are missing', async () => {
    await AsyncStorage.setItem(
      CACHED_SESSION_STORAGE_KEY,
      JSON.stringify({ access_token: 'a' /* missing refresh_token and user */ })
    );
    expect(await readCachedSession()).toBeNull();
  });

  it('returns the session when all required fields are present', async () => {
    const payload = {
      access_token: 'access',
      refresh_token: 'refresh',
      token_type: 'bearer',
      expires_at: 9999999999,
      expires_in: 3600,
      user: { id: 'user-1', email: 'u@example.com' },
    };
    await AsyncStorage.setItem(CACHED_SESSION_STORAGE_KEY, JSON.stringify(payload));
    const session = await readCachedSession();
    expect(session).toMatchObject({
      access_token: 'access',
      refresh_token: 'refresh',
      user: { id: 'user-1' },
    });
  });
});
