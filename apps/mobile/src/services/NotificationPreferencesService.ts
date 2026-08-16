import { supabase } from '../config/supabase';
import type { UserId } from '../types/ids';
import type {
  NotificationPreferences,
  UpdateNotificationPreferences,
} from '../types/notificationPreferences';

type PrefsRow = {
  user_id: string;
  new_message: boolean;
  application_accepted: boolean;
  application_rejected: boolean;
  new_application: boolean;
  application_withdrawn: boolean;
  shift_cancelled: boolean;
  new_review: boolean;
  conversation_started: boolean;
  job_offer_received: boolean;
  job_offer_accepted: boolean;
  job_offer_declined: boolean;
  work_completion_requested: boolean;
  work_completion_confirmed: boolean;
  updated_at: string;
};

const CAMEL_TO_SNAKE: Readonly<Record<keyof UpdateNotificationPreferences, keyof PrefsRow>> = {
  newMessage: 'new_message',
  applicationAccepted: 'application_accepted',
  applicationRejected: 'application_rejected',
  newApplication: 'new_application',
  applicationWithdrawn: 'application_withdrawn',
  shiftCancelled: 'shift_cancelled',
  newReview: 'new_review',
  conversationStarted: 'conversation_started',
  jobOfferReceived: 'job_offer_received',
  jobOfferAccepted: 'job_offer_accepted',
  jobOfferDeclined: 'job_offer_declined',
  workCompletionRequested: 'work_completion_requested',
  workCompletionConfirmed: 'work_completion_confirmed',
};

export class NotificationPreferencesService {
  private static mapPrefs(db: PrefsRow): NotificationPreferences {
    return {
      userId: db.user_id as UserId,
      newMessage: db.new_message,
      applicationAccepted: db.application_accepted,
      applicationRejected: db.application_rejected,
      newApplication: db.new_application,
      applicationWithdrawn: db.application_withdrawn,
      shiftCancelled: db.shift_cancelled,
      newReview: db.new_review,
      conversationStarted: db.conversation_started,
      jobOfferReceived: db.job_offer_received,
      jobOfferAccepted: db.job_offer_accepted,
      jobOfferDeclined: db.job_offer_declined,
      workCompletionRequested: db.work_completion_requested,
      workCompletionConfirmed: db.work_completion_confirmed,
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

      return data ? this.mapPrefs(data as PrefsRow) : null;
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

      for (const key of Object.keys(updates) as Array<keyof UpdateNotificationPreferences>) {
        const value = updates[key];
        if (value !== undefined) {
          row[CAMEL_TO_SNAKE[key]] = value;
        }
      }

      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert(row, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to upsert notification preferences');

      return this.mapPrefs(data as PrefsRow);
    } catch (error) {
      console.error('Error in upsertPreferences:', error);
      throw error;
    }
  }
}
