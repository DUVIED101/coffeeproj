import PushNotificationIOS from '@react-native-community/push-notification-ios';
import type {
  PushNotification,
  PushNotificationPermissions,
} from '@react-native-community/push-notification-ios';
import { supabase } from '../config/supabase';
import type {
  ApnsEnvironment,
  DeviceToken,
  NotificationKind,
  PushNotificationPayload,
} from '../types/notification';
import type { ApplicationId, UserId } from '../types/ids';
import type { ConversationId } from '../types/chat';

const REGISTRATION_TIMEOUT_MS = 30_000;

export class NotificationService {
  // Debug builds receive sandbox tokens; release builds receive production tokens.
  private static resolveEnvironment(): ApnsEnvironment {
    return __DEV__ ? 'sandbox' : 'production';
  }

  private static mapNotification(notification: PushNotification): PushNotificationPayload {
    const rawData = (notification.getData() ?? {}) as {
      kind?: NotificationKind;
      applicationId?: string;
      conversationId?: string;
      userInteraction?: number | boolean;
    };
    const kind: NotificationKind = rawData.kind ?? 'new_message';
    const alert = notification.getAlert();
    const title = typeof alert === 'string' ? undefined : alert?.title;
    const message = notification.getMessage();
    const body =
      typeof alert === 'string'
        ? alert
        : (alert?.body ?? (message != null ? String(message) : undefined));
    const userInteraction = Boolean(rawData.userInteraction);

    return {
      kind,
      title: title ?? undefined,
      body: body ?? undefined,
      userInteraction,
      data: {
        kind,
        applicationId: rawData.applicationId as ApplicationId | undefined,
        conversationId: rawData.conversationId as ConversationId | undefined,
      },
    };
  }

  static async requestPermission(): Promise<boolean> {
    try {
      const permissions = await PushNotificationIOS.requestPermissions({
        alert: true,
        badge: true,
        sound: true,
      });
      return Boolean(permissions.alert || permissions.badge || permissions.sound);
    } catch (error) {
      console.error('NotificationService.requestPermission:', error);
      return false;
    }
  }

  static async checkPermission(): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      try {
        PushNotificationIOS.checkPermissions((permissions: PushNotificationPermissions) => {
          resolve(Boolean(permissions.alert));
        });
      } catch (error) {
        console.error('NotificationService.checkPermission:', error);
        resolve(false);
      }
    });
  }

  static async registerDevice(userId: UserId, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const token = await new Promise<string>((resolve, reject) => {
      const cleanup = (): void => {
        clearTimeout(timeout);
        PushNotificationIOS.removeEventListener('register');
        PushNotificationIOS.removeEventListener('registrationError');
        signal?.removeEventListener('abort', onAbort);
      };

      const onRegister = (deviceToken: string): void => {
        cleanup();
        resolve(deviceToken);
      };

      const onError = (err: { message: string; code: number; details: unknown }): void => {
        cleanup();
        reject(new Error(`APNs registration failed: ${err.message}`));
      };

      const onAbort = (): void => {
        cleanup();
        reject(new DOMException('Aborted', 'AbortError'));
      };

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('APNs registration timeout'));
      }, REGISTRATION_TIMEOUT_MS);

      PushNotificationIOS.addEventListener('register', onRegister);
      PushNotificationIOS.addEventListener('registrationError', onError);
      signal?.addEventListener('abort', onAbort);
    });

    const environment = this.resolveEnvironment();
    const { error } = await supabase.from('apns_tokens').upsert(
      {
        user_id: userId,
        device_token: token as DeviceToken,
        environment,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,device_token' }
    );
    if (error) {
      console.error('NotificationService.registerDevice:', error);
      throw error;
    }
  }

  static async unregisterDevice(userId: UserId): Promise<void> {
    try {
      const { error } = await supabase.from('apns_tokens').delete().eq('user_id', userId);
      if (error) throw error;
    } catch (error) {
      console.error('NotificationService.unregisterDevice:', error);
    }
  }

  static onNotification(handler: (notification: PushNotificationPayload) => void): () => void {
    const onNotif = (notification: PushNotification): void => {
      handler(this.mapNotification(notification));
    };

    PushNotificationIOS.addEventListener('notification', onNotif);
    PushNotificationIOS.addEventListener('localNotification', onNotif);

    return () => {
      PushNotificationIOS.removeEventListener('notification');
      PushNotificationIOS.removeEventListener('localNotification');
    };
  }

  /**
   * Cold-start tap: returns the notification that launched the app from a
   * terminated state, or null. Safe to call repeatedly — only the first call
   * returns a payload.
   */
  static async getInitialNotification(): Promise<PushNotificationPayload | null> {
    try {
      const initial = await PushNotificationIOS.getInitialNotification();
      return initial ? this.mapNotification(initial) : null;
    } catch (error) {
      console.error('NotificationService.getInitialNotification:', error);
      return null;
    }
  }
}
