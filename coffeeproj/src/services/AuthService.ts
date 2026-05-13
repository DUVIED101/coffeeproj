import { supabase } from '../config/supabase';
import type { AccountType } from '../types';

export class AuthService {
  /**
   * Sign up with email and password. Auth-only — the public.users row is
   * created by ProfileBootstrapScreen after navigation routes there on the
   * isAuthenticated && !user state.
   * IMPORTANT: Requires email confirmation to be DISABLED in Supabase dashboard.
   */
  static async signUpWithEmail(
    email: string,
    password: string,
    accountType: AccountType,
    phoneNumber?: string
  ): Promise<{ user: any }> {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            account_type: accountType,
            ...(phoneNumber !== undefined ? { phone_number: phoneNumber } : {}),
          },
        },
      });

      if (authError) {
        if (authError.message.includes('invalid')) {
          throw new Error(
            'This email address cannot be used. Please try a different email address or contact support.'
          );
        }
        if (authError.message.includes('rate limit')) {
          throw new Error(
            'Too many registration attempts. Please wait a few minutes and try again.'
          );
        }
        throw authError;
      }
      if (!authData.user) throw new Error('No user returned from signup');
      if (!authData.session) {
        throw new Error(
          'Email confirmation is required. Please check your email and contact support if this continues.'
        );
      }

      return { user: authData.user };
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }

  /**
   * Sign in with email and password
   */
  static async signInWithEmail(
    email: string,
    password: string
  ): Promise<{ session: any; user: any }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        // Provide more helpful error messages
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password');
        }
        if (error.message.includes('Email not confirmed')) {
          throw new Error(
            'Please confirm your email address before signing in. Check your inbox for the confirmation link.'
          );
        }
        throw error;
      }

      if (!data.session || !data.user) {
        throw new Error('No session returned from sign in');
      }

      return { session: data.session, user: data.user };
    } catch (error) {
      console.error('Error in signInWithEmail:', error);
      throw error;
    }
  }

  /**
   * Sign out current user
   */
  static async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error in signOut:', error);
      throw error;
    }
  }

  /**
   * Reset password for email
   */
  static async resetPassword(email: string): Promise<void> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'coffeeproj://reset-password', // Deep link for mobile
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error in resetPassword:', error);
      throw error;
    }
  }

  /**
   * Update user password
   */
  static async updatePassword(newPassword: string): Promise<void> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error in updatePassword:', error);
      throw error;
    }
  }

  /**
   * Get current session
   */
  static async getSession(): Promise<any> {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) throw error;
      return session;
    } catch (error) {
      console.error('Error in getSession:', error);
      throw error;
    }
  }

  /**
   * Refresh current session
   */
  static async refreshSession(): Promise<any> {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();

      if (error) throw error;
      return session;
    } catch (error) {
      console.error('Error in refreshSession:', error);
      throw error;
    }
  }

  /**
   * Change password by re-authenticating with current password first.
   * Does NOT sign the user out on success.
   */
  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session?.user?.email) {
        throw new Error('No active session');
      }

      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword,
      });

      if (reauthError) {
        throw new Error('invalid_current_password');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error in changePassword:', error);
      throw error;
    }
  }

  /**
   * Delete the current user's account via the `delete-user` Edge Function.
   * On success, clears the local session.
   */
  static async deleteAccount(params: { password: string; force?: boolean }): Promise<void> {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session) {
        throw new Error('No active session');
      }

      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: {
          password: params.password,
          force: params.force ?? false,
        },
      });

      if (error) {
        const ctx = (error as { context?: Response }).context;
        const status = ctx?.status;
        let rawBody = '';
        let payload: { error?: string; count?: number } = {};
        if (ctx && typeof ctx.text === 'function') {
          try {
            rawBody = await ctx.text();
            try {
              payload = JSON.parse(rawBody) as typeof payload;
            } catch {
              payload = {};
            }
          } catch {
            rawBody = '';
          }
        }
        console.error('[deleteAccount] edge function error', {
          status,
          rawBody,
          errorName: (error as Error).name,
          errorMessage: error.message,
        });
        if (status === 403) {
          throw new Error('invalid_password');
        }
        if (status === 409) {
          throw new Error(`active_jobs:${payload.count ?? 0}`);
        }
        throw new Error(payload.error ?? error.message ?? 'delete_account_failed');
      }
      void data;

      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error in deleteAccount:', error);
      throw error;
    }
  }
}
