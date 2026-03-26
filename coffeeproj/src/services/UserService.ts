import { supabase } from '../config/supabase';
import type { User, UpdateUserData } from '../types';

export class UserService {
  /**
   * Map database user object to User type
   */
  private static mapDatabaseUser(dbUser: any): User {
    return {
      id: dbUser.id,
      uid: dbUser.id,
      email: dbUser.email,
      phoneNumber: dbUser.phone_number,
      accountType: dbUser.account_type,
      isActive: dbUser.is_active,
      isVerified: dbUser.is_verified,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
    };
  }

  /**
   * Get user profile by ID
   */
  static async getUserProfile(userId: string): Promise<User> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('User not found');

      return this.mapDatabaseUser(data);
    } catch (error) {
      console.error('Error in getUserProfile:', error);
      throw error;
    }
  }

  /**
   * Get user profile by email
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }

      return data ? this.mapDatabaseUser(data) : null;
    } catch (error) {
      console.error('Error in getUserByEmail:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(
    userId: string,
    updates: UpdateUserData
  ): Promise<User> {
    try {
      const dbUpdates: any = {};

      if (updates.phoneNumber !== undefined) {
        dbUpdates.phone_number = updates.phoneNumber;
      }
      if (updates.isActive !== undefined) {
        dbUpdates.is_active = updates.isActive;
      }

      const { data, error } = await supabase
        .from('users')
        .update(dbUpdates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to update user profile');

      return this.mapDatabaseUser(data);
    } catch (error) {
      console.error('Error in updateUserProfile:', error);
      throw error;
    }
  }

  /**
   * Deactivate user account
   */
  static async deactivateAccount(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error in deactivateAccount:', error);
      throw error;
    }
  }

  /**
   * Reactivate user account
   */
  static async reactivateAccount(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: true })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error in reactivateAccount:', error);
      throw error;
    }
  }

  /**
   * Check if email exists
   */
  static async emailExists(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return false;
        }
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Error in emailExists:', error);
      throw error;
    }
  }
}
