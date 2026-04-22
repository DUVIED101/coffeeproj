import { supabase } from '../config/supabase';
import type { UserId } from '../types/ids';
import type {
  NotificationPreferences,
  UpdateNotificationPreferences,
} from '../types/notificationPreferences';

export class NotificationPreferencesService {
  private static mapPrefs(db: any): NotificationPreferences {
    return {
      userId: db.user_id as UserId,
      newMessage: db.new_message,
      applicationAccepted: db.application_accepted,
      applicationRejected: db.application_rejected,
      updatedAt: db.updated_at,
    };
  }

  static async getPreferences(userId: UserId): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data ? this.mapPrefs(data) : null;
    } catch (error) {
      console.error('Error in getPreferences:', error);
      throw error;
    }
  }

  static async upsertPreferences(
    userId: UserId,
    updates: UpdateNotificationPreferences
  ): Promise<NotificationPreferences> {
    try {
      const row: Record<string, unknown> = { user_id: userId };

      if (updates.newMessage !== undefined) {
        row.new_message = updates.newMessage;
      }
      if (updates.applicationAccepted !== undefined) {
        row.application_accepted = updates.applicationAccepted;
      }
      if (updates.applicationRejected !== undefined) {
        row.application_rejected = updates.applicationRejected;
      }

      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert(row, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to upsert notification preferences');

      return this.mapPrefs(data);
    } catch (error) {
      console.error('Error in upsertPreferences:', error);
      throw error;
    }
  }
}
