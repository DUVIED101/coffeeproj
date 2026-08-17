import PushNotificationIOS, {
  type PushNotification,
  type PushNotificationPermissions,
} from '@react-native-community/push-notification-ios';
import type {
  PushAdapter,
  PushPermission,
  PushSubscription,
} from '@bystrobarista/core/platform/push';
import type {
  DeviceToken,
  NotificationKind,
  PushNotificationPayload,
} from '@bystrobarista/core/types/notification';
import type { ApplicationId, JobId, JobOfferId } from '@bystrobarista/core/types/ids';
import type { ConversationId } from '@bystrobarista/core/types/chat';

const REGISTRATION_TIMEOUT_MS = 30_000;

const mapNotification = (notification: PushNotification): PushNotificationPayload => {
  const rawData = (notification.getData() ?? {}) as {
    kind?: NotificationKind;
    applicationId?: string;
    conversationId?: string;
    jobId?: string;
    offerId?: string;
    actionIdentifier?: string;
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
  const rawActionId = notification.getActionIdentifier?.();
  const actionIdentifier =
    typeof rawActionId === 'string' && rawActionId.length > 0
      ? rawActionId
      : typeof rawData.actionIdentifier === 'string' && rawData.actionIdentifier.length > 0
        ? rawData.actionIdentifier
        : undefined;

  return {
    kind,
    title: title ?? undefined,
    body: body ?? undefined,
    userInteraction,
    actionIdentifier,
    data: {
      kind,
      applicationId: rawData.applicationId as ApplicationId | undefined,
      conversationId: rawData.conversationId as ConversationId | undefined,
      jobId: rawData.jobId as JobId | undefined,
      offerId: rawData.offerId as JobOfferId | undefined,
    },
  };
};

// Debug builds receive sandbox tokens; release builds receive production tokens.
const resolveEnvironment = (): 'sandbox' | 'production' =>
  __DEV__ ? 'sandbox' : 'production';

export const nativePush: PushAdapter = {
  async requestPermission() {
    try {
      const permissions = await PushNotificationIOS.requestPermissions({
        alert: true,
        badge: true,
        sound: true,
      });
      return Boolean(permissions.alert || permissions.badge || permissions.sound);
    } catch (error) {
      console.error('nativePush.requestPermission:', error);
      return false;
    }
  },

  checkPermission() {
    return new Promise<PushPermission>(resolve => {
      try {
        PushNotificationIOS.checkPermissions((permissions: PushNotificationPermissions) => {
          resolve(permissions.alert ? 'granted' : 'denied');
        });
      } catch (error) {
        console.error('nativePush.checkPermission:', error);
        resolve('denied');
      }
    });
  },

  async subscribe(signal?: AbortSignal): Promise<PushSubscription> {
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

    return { token: token as DeviceToken, environment: resolveEnvironment() };
  },

  async unsubscribe() {
    // iOS auto-invalidates the token when the OS deregisters the app; there's
    // no explicit "release APNs token" API. Nothing to do here — the caller
    // (NotificationService) still needs to delete the row from apns_tokens.
  },

  onNotification(handler: (payload: PushNotificationPayload) => void): () => void {
    const onNotif = (notification: PushNotification): void => {
      handler(mapNotification(notification));
    };
    PushNotificationIOS.addEventListener('notification', onNotif);
    PushNotificationIOS.addEventListener('localNotification', onNotif);
    return () => {
      PushNotificationIOS.removeEventListener('notification');
      PushNotificationIOS.removeEventListener('localNotification');
    };
  },

  async getInitialNotification() {
    try {
      const initial = await PushNotificationIOS.getInitialNotification();
      return initial ? mapNotification(initial) : null;
    } catch (error) {
      console.error('nativePush.getInitialNotification:', error);
      return null;
    }
  },

  clearAllDelivered() {
    try {
      PushNotificationIOS.removeAllDeliveredNotifications();
      PushNotificationIOS.setApplicationIconBadgeNumber(0);
    } catch (error) {
      console.error('nativePush.clearAllDelivered:', error);
    }
  },
};
