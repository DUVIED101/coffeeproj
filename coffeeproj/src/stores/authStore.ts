import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { User } from '../types';
import type { UserId } from '../types/ids';
import { supabase } from '../config/supabase';
import { AuthService } from '../services/AuthService';
import { NotificationService } from '../services/NotificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  // State
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
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

  // Initialize auth state on app start
  initialize: async () => {
    try {
      set({ isLoading: true });

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error('Error getting session:', error);
        get().clearAuth();
        return;
      }

      if (!session) {
        get().clearAuth();
        return;
      }

      const user = await fetchUserProfile(session.user.id);
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

async function fetchUserProfile(userId: string): Promise<User | null> {
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
  };
}

// IMPORTANT: supabase-js docs forbid awaiting other supabase calls inside
// onAuthStateChange — it deadlocks the auth SDK lock. Defer work via setTimeout(0).
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event);

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
            console.log('Profile not yet present after SIGNED_IN; waiting for bootstrap');
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
