import { supabase } from '../config/supabase';
import type { AccountType, User } from '../types';

export class AuthService {
  /**
   * Sign up with email and password
   * IMPORTANT: Requires email confirmation to be DISABLED in Supabase dashboard
   */
  static async signUpWithEmail(
    email: string,
    password: string,
    accountType: AccountType,
    phoneNumber?: string
  ): Promise<{ user: any; profile: User }> {
    try {
      // 1. Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        // Provide more helpful error messages
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

      // 2. Check if session was created (email confirmation disabled)
      if (!authData.session) {
        throw new Error(
          'Email confirmation is required. Please check your email and contact support if this continues.'
        );
      }

      // 3. Create user profile
      // Session is now active (because email confirmation is disabled),
      // so this INSERT will use authenticated role with auth.uid() available

      // Small delay to ensure auth state is fully synchronized
      await new Promise(resolve => setTimeout(resolve, 100));

      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          phone_number: phoneNumber,
          account_type: accountType,
        })
        .select()
        .single();

      if (userError) {
        console.error('Failed to create user profile:', userError);
        console.error('Error details:', {
          code: userError.code,
          message: userError.message,
          details: userError.details,
        });

        // Try to fetch if it already exists
        const { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (existingUser) {
          // Profile exists, return it
          const profile: User = {
            id: existingUser.id,
            uid: existingUser.id,
            email: existingUser.email,
            phoneNumber: existingUser.phone_number,
            accountType: existingUser.account_type,
            isActive: existingUser.is_active,
            isVerified: existingUser.is_verified,
            createdAt: existingUser.created_at,
            updatedAt: existingUser.updated_at,
          };
          return { user: authData.user, profile };
        }

        // Could not create or fetch profile
        throw new Error(
          `Failed to create user profile: ${userError.message}. Please contact support.`
        );
      }

      // 4. Map database user to User type
      const profile: User = {
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

      return { user: authData.user, profile };
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
}
