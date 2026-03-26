import { supabase } from '../config/supabase';
import type { AccountType, User } from '../types';

export class AuthService {
  /**
   * Sign up with email and password
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

      if (authError) throw authError;
      if (!authData.user) throw new Error('No user returned from signup');

      // 2. Create user profile in users table
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

      if (userError) throw userError;
      if (!userData) throw new Error('Failed to create user profile');

      // 3. Map database user to User type
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
      console.error('Error in signUpWithEmail:', error);
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

      if (error) throw error;
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
