import AsyncStorage from '@react-native-async-storage/async-storage';
import { projectRefFromUrl, readCachedSession, cachedSessionStorageKey } from './cachedSession';

describe('projectRefFromUrl', () => {
  it('extracts the leftmost label from a supabase.co URL', () => {
    expect(projectRefFromUrl('https://zifvfsamfzepxxuxhyhg.supabase.co')).toBe(
      'zifvfsamfzepxxuxhyhg'
    );
  });

  it('handles trailing slash and path', () => {
    expect(projectRefFromUrl('https://abc123.supabase.co/auth/v1')).toBe('abc123');
  });

  it('returns null for non-supabase.co URLs', () => {
    expect(projectRefFromUrl('https://example.com')).toBeNull();
  });

  it('returns null for malformed input', () => {
    expect(projectRefFromUrl('not-a-url')).toBeNull();
  });
});

describe('cachedSessionStorageKey', () => {
  it('returns the supabase-js v2 key format', () => {
    expect(cachedSessionStorageKey('https://abc.supabase.co')).toBe('sb-abc-auth-token');
  });

  it('returns null when ref cannot be extracted', () => {
    expect(cachedSessionStorageKey('https://example.com')).toBeNull();
  });
});

describe('readCachedSession', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns null when no entry exists', async () => {
    const session = await readCachedSession('https://abc.supabase.co');
    expect(session).toBeNull();
  });

  it('returns null when the entry is malformed JSON', async () => {
    await AsyncStorage.setItem('sb-abc-auth-token', '{not json');
    const session = await readCachedSession('https://abc.supabase.co');
    expect(session).toBeNull();
  });

  it('returns null when required fields are missing', async () => {
    await AsyncStorage.setItem(
      'sb-abc-auth-token',
      JSON.stringify({ access_token: 'a' /* missing refresh_token and user */ })
    );
    const session = await readCachedSession('https://abc.supabase.co');
    expect(session).toBeNull();
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
    await AsyncStorage.setItem('sb-abc-auth-token', JSON.stringify(payload));
    const session = await readCachedSession('https://abc.supabase.co');
    expect(session).toMatchObject({
      access_token: 'access',
      refresh_token: 'refresh',
      user: { id: 'user-1' },
    });
  });

  it('returns null when the URL has no extractable project ref', async () => {
    const session = await readCachedSession('https://example.com');
    expect(session).toBeNull();
  });
});
