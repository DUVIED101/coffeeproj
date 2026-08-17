import { getSupabase } from '../config/supabase';
import { getPlatform } from '../platform';
import type { DeviceToken, PushNotificationPayload } from '../types/notification';
import type { UserId } from '../types/ids';

export class NotificationService {
  private static lastRegisteredToken: DeviceToken | null = null;

  static async requestPermission(): Promise<boolean> {
    return getPlatform().push.requestPermission();
  }

  static async checkPermission(): Promise<boolean> {
    const result = await getPlatform().push.checkPermission();
    return result === 'granted';
  }

  static async registerDevice(userId: UserId, signal?: AbortSignal): Promise<void> {
    const subscription = await getPlatform().push.subscribe(signal);
    const { error } = await getSupabase()
      .from('apns_tokens')
      .upsert(
        {
          user_id: userId,
          device_token: subscription.token,
          environment: subscription.environment,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,device_token' }
      );
    if (error) {
      console.error('NotificationService.registerDevice:', error);
      throw error;
    }
    this.lastRegisteredToken = subscription.token;
  }

  static async unregisterDevice(userId: UserId): Promise<void> {
    try {
      const query = getSupabase().from('apns_tokens').delete().eq('user_id', userId);
      // Scope the delete to THIS device's token when we have one. Falling back
      // to wiping every row would log the user out of push on all their other
      // devices too.
      const { error } = this.lastRegisteredToken
        ? await query.eq('device_token', this.lastRegisteredToken)
        : await query;
      if (error) throw error;
      this.lastRegisteredToken = null;
      await getPlatform().push.unsubscribe();
    } catch (error) {
      console.error('NotificationService.unregisterDevice:', error);
    }
  }

  static onNotification(handler: (notification: PushNotificationPayload) => void): () => void {
    return getPlatform().push.onNotification(handler);
  }

  /**
   * Drop every delivered notification from the OS Notification Center and
   * zero out the badge. Called on app foreground so older alerts don't
   * linger after the user has opened the app.
   */
  static clearAllDelivered(): void {
    getPlatform().push.clearAllDelivered();
  }

  /**
   * Cold-start tap: returns the notification that launched the app from a
   * terminated state, or null. Safe to call repeatedly — only the first
   * call returns a payload.
   */
  static async getInitialNotification(): Promise<PushNotificationPayload | null> {
    return getPlatform().push.getInitialNotification();
  }
}
