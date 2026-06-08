import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL } from '@env';
import { cachedSessionStorageKey } from '../utils/cachedSession';

// react-native-dotenv inlines @env at babel-time, so SUPABASE_URL is the
// real project URL even under Jest. Compute the cached-session key the same
// way the production code does.
const CACHED_KEY = cachedSessionStorageKey(SUPABASE_URL) ?? 'sb-unknown-auth-token';

jest.mock('../config/supabase', () => {
  const auth = {
    getSession: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(),
  };
  const from = jest.fn();
  return { supabase: { auth, from } };
});

import { supabase } from '../config/supabase';

const mockGetSession = supabase.auth.getSession as jest.Mock;
const mockSignOut = supabase.auth.signOut as jest.Mock;
const mockFrom = supabase.from as jest.Mock;

jest.mock('../services/NotificationService', () => ({
  NotificationService: { unregisterDevice: jest.fn() },
}));

jest.mock('../services/AuthService', () => ({
  AuthService: { deleteAccount: jest.fn() },
}));

import { useAuthStore } from './authStore';

const validSession = {
  access_token: 'access',
  refresh_token: 'refresh',
  expires_at: 9999999999,
  expires_in: 3600,
  token_type: 'bearer',
  user: { id: 'user-1', email: 'u@test.com' },
};

const validUserRow = {
  id: 'user-1',
  email: 'u@test.com',
  account_type: 'barista',
  is_active: true,
  is_verified: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  suspended_until: null,
  banned_at: null,
  ban_reason: null,
};

const mockUserSelectReturning = (row: typeof validUserRow | null, error: unknown = null) => {
  mockFrom.mockReturnValue({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: row, error }),
      }),
    }),
  });
};

const resetStore = () =>
  useAuthStore.setState({
    session: null,
    user: null,
    isLoading: true,
    isAuthenticated: false,
    connectionError: null,
    sessionStaleFromCache: false,
  });

describe('authStore.initialize', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    resetStore();
  });

  it('signs in when getSession returns a session and the profile loads', async () => {
    mockGetSession.mockResolvedValue({ data: { session: validSession }, error: null });
    mockUserSelectReturning(validUserRow);
    await useAuthStore.getState().initialize();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.id).toBe('user-1');
    expect(useAuthStore.getState().connectionError).toBeNull();
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('clears auth when getSession returns no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    await useAuthStore.getState().initialize();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().connectionError).toBeNull();
  });

  it('on getSession timeout with no cached session: sets connectionError "timeout"', async () => {
    mockGetSession.mockImplementation(() => new Promise(() => {}));
    await useAuthStore.getState().initialize();
    expect(useAuthStore.getState().connectionError).toBe('timeout');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
  }, 15000);

  it('on getSession timeout WITH cached session: hydrates from cache and proceeds', async () => {
    await AsyncStorage.setItem(CACHED_KEY, JSON.stringify(validSession));
    mockGetSession.mockImplementation(() => new Promise(() => {}));
    mockUserSelectReturning(validUserRow);
    await useAuthStore.getState().initialize();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().sessionStaleFromCache).toBe(true);
    expect(useAuthStore.getState().connectionError).toBeNull();
  }, 15000);

  it('on fetchUserProfile timeout: keeps session, marks stale, leaves user null', async () => {
    mockGetSession.mockResolvedValue({ data: { session: validSession }, error: null });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => new Promise(() => {}),
        }),
      }),
    });
    await useAuthStore.getState().initialize();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().sessionStaleFromCache).toBe(true);
  }, 15000);

  it('retryInitialize is a no-op while isLoading is true', async () => {
    useAuthStore.setState({ isLoading: true });
    await useAuthStore.getState().retryInitialize();
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it('retryInitialize calls initialize when not loading', async () => {
    useAuthStore.setState({ isLoading: false });
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    await useAuthStore.getState().retryInitialize();
    expect(mockGetSession).toHaveBeenCalledTimes(1);
  });
});
