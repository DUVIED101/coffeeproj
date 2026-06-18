import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { User } from '../types';
import type { UserId } from '../types/ids';
import { supabase } from '../config/supabase';
import { AuthService } from '../services/AuthService';
import { NotificationService } from '../services/NotificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { withTimeout, TimeoutError } from '../utils/withTimeout';
import { readCachedSession } from '../utils/cachedSession';

// Cold-start network calls are wrapped in this timeout so the app cannot
// hang on the spinner forever when Supabase is unreachable (Cloudflare-fronted,
// blocked intermittently from Russian ISPs). 8s is the sweet spot — long enough
// that a slow-but-working network completes, short enough to feel responsive.
const STARTUP_TIMEOUT_MS = 8000;

interface AuthState {
  // State
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  // null = healthy. 'timeout' = startup network call exceeded STARTUP_TIMEOUT_MS
  // and no cached session was available to fall back on.
  connectionError: 'timeout' | null;
  // true when we proceeded on a locally-cached session because the server
  // round-trip timed out. Surfaced for UX (stale-data toast) and debugging.
  sessionStaleFromCache: boolean;

  // Actions
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
  retryInitialize: () => Promise<void>;
  refreshUserProfile: () => Promise<User | null>;
  signOut: () => Promise<void>;
  deleteAccount: (
    params:
      | { password: string; force?: boolean }
      | { otpCode: string; force?: boolean }
      | { appleIdToken: string; force?: boolean }
  ) => Promise<void>;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  session: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,
  connectionError: null,
  sessionStaleFromCache: false,

  // Set session and update authenticated state
  setSession: (session: Session | null) => {
    set({
      session,
      isAuthenticated: !!session,
    });
  },

  // Set user profile
  setUser: (user: User | null) => {
    set({ user });
  },

  // Set loading state
  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  // Initialize auth state on app start.
  //
  // Both getSession() and fetchUserProfile() are wrapped in withTimeout so the
  // app cannot hang on the spinner forever when Supabase is unreachable.
  // On getSession timeout: fall back to a locally-cached session if one exists
  // (returning users keep working offline); otherwise surface connectionError
  // so AppNavigator routes to ConnectionErrorScreen.
  initialize: async () => {
    try {
      set({ isLoading: true, connectionError: null, sessionStaleFromCache: false });

      let session: Session | null;
      try {
        const result = await withTimeout(
          supabase.auth.getSession(),
          STARTUP_TIMEOUT_MS,
          'getSession'
        );
        if (result.error) {
          console.error('Error getting session:', result.error);
          get().clearAuth();
          return;
        }
        session = result.data.session;
      } catch (error) {
        if (error instanceof TimeoutError) {
          const cached = await readCachedSession();
          if (cached) {
            // Returning user, Supabase unreachable: hydrate from cache and
            // proceed. supabase-js autoRefreshToken will retry in background.
            set({ sessionStaleFromCache: true });
            get().setSession(cached);
            void backgroundFetchProfile(cached.user.id);
            return;
          }
          set({ connectionError: 'timeout' });
          get().clearAuth();
          return;
        }
        throw error;
      }

      if (!session) {
        get().clearAuth();
        return;
      }

      let user: User | null = null;
      try {
        user = await withTimeout(
          fetchUserProfile(session.user.id),
          STARTUP_TIMEOUT_MS,
          'fetchUserProfile'
        );
      } catch (error) {
        if (error instanceof TimeoutError) {
          // Session valid, profile fetch timed out. Keep session — the
          // ProfileBootstrap path / banners re-fire when the profile arrives.
          set({ sessionStaleFromCache: true });
          get().setSession(session);
          void backgroundFetchProfile(session.user.id);
          return;
        }
        throw error;
      }

      if (!user || !user.isActive) {
        // Clear local state immediately — do NOT await signOut() here.
        // The /logout endpoint can timeout (504) and would hold isLoading:true
        // for 30+ seconds, making the app appear frozen on startup.
        get().clearAuth();
        supabase.auth.signOut().catch(() => {});
        return;
      }

      get().setUser(user);
      get().setSession(session);
    } catch (error) {
      console.error('Error initializing auth:', error);
      get().clearAuth();
    } finally {
      set({ isLoading: false });
    }
  },

  retryInitialize: async () => {
    if (get().isLoading) return;
    await get().initialize();
  },

  // Refetch the user row from public.users without going through full
  // initialize(). Used when the client detects an account_blocked write to
  // catch up suspended_until / banned_at before showing the explanation UI.
  refreshUserProfile: async () => {
    const session = get().session;
    if (!session?.user?.id) return null;
    const profile = await fetchUserProfile(session.user.id);
    if (profile) {
      set({ user: profile });
    }
    return profile;
  },

  // Sign out
  signOut: async () => {
    try {
      set({ isLoading: true });

      const currentUserId = get().user?.id;
      if (currentUserId) {
        try {
          await NotificationService.unregisterDevice(currentUserId as UserId);
        } catch (err) {
          console.warn('Error unregistering device on sign out:', err);
        }
      }

      // Clear local state first so the UI responds immediately even if the
      // server-side /logout request times out (504 context deadline exceeded).
      get().clearAuth();
      await AsyncStorage.removeItem('supabase.auth.token');

      supabase.auth.signOut().catch(err => {
        console.warn('Server-side signOut failed (non-blocking):', err);
      });
    } catch (error) {
      console.error('Error during sign out:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Delete the current user's account and clear local session state.
  // Intentionally does NOT touch the global `isLoading` flag — AppNavigator
  // unmounts the whole tree while isLoading is true, which would tear down
  // the DeleteAccountScreen and swallow validation errors (e.g. wrong
  // password). The screen owns its own submit-loading state.
  deleteAccount: async (
    params:
      | { password: string; force?: boolean }
      | { otpCode: string; force?: boolean }
      | { appleIdToken: string; force?: boolean }
  ) => {
    const currentUserId = get().user?.id;
    if (currentUserId) {
      try {
        await NotificationService.unregisterDevice(currentUserId as UserId);
      } catch (err) {
        console.warn('Error unregistering device on delete:', err);
      }
    }

    await AuthService.deleteAccount(params);

    get().clearAuth();
    await AsyncStorage.removeItem('supabase.auth.token');
  },

  // Clear auth state
  clearAuth: () => {
    set({
      session: null,
      user: null,
      isAuthenticated: false,
    });
  },
}));

// Used after the cached-session fallback fires. Fetches the profile in the
// background once the user is already inside the app; failure is non-fatal
// (BannedUserBlocker / SuspendedUserBanner re-render when the profile lands).
async function backgroundFetchProfile(userId: string): Promise<void> {
  try {
    const user = await withTimeout(fetchUserProfile(userId), STARTUP_TIMEOUT_MS, 'bgFetchProfile');
    if (user && user.isActive) {
      useAuthStore.getState().setUser(user);
    }
  } catch (error) {
    if (!(error instanceof TimeoutError)) {
      console.warn('backgroundFetchProfile failed:', error);
    }
  }
}

// In-flight dedupe: on cold-start both `initialize()` and the
// `onAuthStateChange(SIGNED_IN)` listener kick off a profile fetch in
// parallel. Without dedupe that's two identical round-trips on the wire
// (measured: ~3.8s × 2 on a congested proxy). Sharing the promise collapses
// them into one network call; both callers resolve from the same response.
const inflightProfileFetches = new Map<string, Promise<User | null>>();

async function fetchUserProfile(userId: string): Promise<User | null> {
  const existing = inflightProfileFetches.get(userId);
  if (existing) return existing;
  const promise = doFetchUserProfile(userId).finally(() => {
    inflightProfileFetches.delete(userId);
  });
  inflightProfileFetches.set(userId, promise);
  return promise;
}

async function doFetchUserProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
  if (error || !data) {
    // PGRST116 = "no rows returned" — expected during signup before the
    // ProfileBootstrap screen has had a chance to create the row. Suppress.
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user profile:', error);
    }
    return null;
  }
  return {
    id: data.id,
    uid: data.id,
    email: data.email,
    accountType: data.account_type,
    isActive: data.is_active,
    isVerified: data.is_verified,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    suspendedUntil: data.suspended_until ?? null,
    bannedAt: data.banned_at ?? null,
    banReason: data.ban_reason ?? null,
    consentAcceptedAt: data.consent_accepted_at ?? null,
  };
}

// Registered explicitly from App.tsx bootstrap (post-migrateSessionKey) so
// the listener attaches AFTER any session-key migration has settled the
// AsyncStorage state — otherwise supabase-js's async initialize() races
// the migration and the listener can see stale events.
//
// IMPORTANT: supabase-js docs forbid awaiting other supabase calls inside
// onAuthStateChange — it deadlocks the auth SDK lock. Defer work via setTimeout(0).
export function registerAuthListener(): void {
  supabase.auth.onAuthStateChange((event, session) => {

    const store = useAuthStore.getState();

    if (event === 'SIGNED_IN' && session) {
      // SIGNED_IN also fires right after supabase.auth.signUp(), before the
      // client has had a chance to upsert the public.users row. We must NOT
      // sign the user out here on a missing profile — that would race with
      // AuthService.signUpWithEmail and invalidate the session it needs.
      // The screens (SignupScreen, LoginScreen) own profile-load failures.
      store.setSession(session);
      setTimeout(() => {
        fetchUserProfile(session.user.id)
          .then(user => {
            if (!user) {
              // Normal on signup — ProfileBootstrap will create the row and call
              // setUser itself. console.log only so this doesn't surface in LogBox.
              return;
            }
            if (!user.isActive) {
              // Same fire-and-forget pattern as initialize() — don't await /logout.
              useAuthStore.getState().clearAuth();
              supabase.auth.signOut().catch(() => {});
              return;
            }
            useAuthStore.getState().setUser(user);
          })
          .catch(err => {
            console.error('Error fetching user profile on SIGNED_IN:', err);
          });
      }, 0);
    } else if (event === 'TOKEN_REFRESHED' && session) {
      // Periodic token refresh: just update the session. Do NOT refetch the
      // profile — user data hasn't changed and a transient fetch failure must
      // not log the user out mid-session.
      store.setSession(session);
    } else if (event === 'SIGNED_OUT') {
      store.clearAuth();
    }
  });
}
