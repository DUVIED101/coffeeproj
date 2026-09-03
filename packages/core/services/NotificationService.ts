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

  // One row per push target in device_tokens. Web subscriptions store the
  // endpoint as the token plus their two keys; native rows leave the keys
  // NULL (enforced by the device_tokens_platform_shape check).
  static async registerDevice(userId: UserId, signal?: AbortSignal): Promise<void> {
    const subscription = await getPlatform().push.subscribe(signal);
    const isWeb = subscription.environment === 'web';
    if (isWeb && !subscription.webPushKeys) {
      throw new Error('Web Push subscription is missing p256dh/auth keys');
    }
    const { error } = await getSupabase()
      .from('device_tokens')
      .upsert(
        {
          user_id: userId,
          device_token: subscription.token,
          environment: subscription.environment,
          platform: isWeb ? 'web' : 'ios',
          p256dh: isWeb ? subscription.webPushKeys!.p256dh : null,
          auth: isWeb ? subscription.webPushKeys!.auth : null,
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

  // `token` lets a caller that knows its own subscription (web settings after
  // a reload, when lastRegisteredToken is empty) drop exactly that row.
  static async unregisterDevice(userId: UserId, token?: DeviceToken): Promise<void> {
    try {
      const target = token ?? this.lastRegisteredToken;
      // Only delete a token we can name — this session's registration or the
      // caller's explicit one. When we never registered (push denied, or a
      // browser without push support), deleting nothing is the only safe
      // option: an unscoped delete would wipe the user's push tokens on every
      // other device (e.g. web sign-out silently killing iPhone notifications).
      if (!target) return;
      const { error } = await getSupabase()
        .from('device_tokens')
        .delete()
        .eq('user_id', userId)
        .eq('device_token', target);
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
