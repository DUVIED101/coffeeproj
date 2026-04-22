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
  deleteAccount: (params: { password: string; force?: boolean }) => Promise<void>;
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

      // Get current session from Supabase
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error('Error getting session:', error);
        get().clearAuth();
        return;
      }

      if (session) {
        get().setSession(session);

        // Fetch user profile if we have a session
        const userId = session.user.id;
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (userError) {
          console.error('Error fetching user profile:', userError);
        } else if (userData) {
          console.log('[AuthStore] Raw userData from DB:', userData);
          console.log('[AuthStore] account_type field:', userData.account_type);
          console.log('[AuthStore] account_type type:', typeof userData.account_type);
          const user: User = {
            id: userData.id,
            uid: userData.id,
            email: userData.email,
            phoneNumber: userData.phone_number,
            accountType: userData.account_type,
            isActive: userData.is_active,
            isVerified: userData.is_verified,
            createdAt: userData.created_at,
            updatedAt: userData.updated_at,
          };
          console.log('[AuthStore] Mapped user object:', user);
          console.log('[AuthStore] user.accountType:', user.accountType);
          get().setUser(user);
        }
      } else {
        get().clearAuth();
      }
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

      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        throw error;
      }

      get().clearAuth();
      await AsyncStorage.removeItem('supabase.auth.token');
    } catch (error) {
      console.error('Error during sign out:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Delete the current user's account and clear local session state.
  deleteAccount: async (params: { password: string; force?: boolean }) => {
    try {
      set({ isLoading: true });

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
    } catch (error) {
      console.error('Error during deleteAccount:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
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

// Setup auth state listener
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event);

  const store = useAuthStore.getState();

  if (event === 'SIGNED_IN' && session) {
    store.setSession(session);

    // Fetch user profile
    const userId = session.user.id;
    supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching user profile:', error);
        } else if (data) {
          const user: User = {
            id: data.id,
            uid: data.id,
            email: data.email,
            phoneNumber: data.phone_number,
            accountType: data.account_type,
            isActive: data.is_active,
            isVerified: data.is_verified,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
          store.setUser(user);
        }
      });
  } else if (event === 'SIGNED_OUT') {
    store.clearAuth();
  } else if (event === 'TOKEN_REFRESHED' && session) {
    store.setSession(session);
  }
});
