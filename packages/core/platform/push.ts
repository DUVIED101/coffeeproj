import type { DeviceToken, PushNotificationPayload } from '../types/notification';

export type PushPermission = 'granted' | 'denied' | 'default';

// Result of a successful push subscription attempt.
// Mobile hands back an APNs device token; web hands back a Web Push
// subscription (endpoint + keys). The single-token variant covers both
// today — mobile reads `token`, web sets `token` to the endpoint plus
// stashes `webPushKeys` on the sink side.
export type PushSubscription = {
  token: DeviceToken;
  environment: 'sandbox' | 'production' | 'web';
  webPushKeys?: { p256dh: string; auth: string };
};

export type PushAdapter = {
  requestPermission(): Promise<boolean>;
  checkPermission(): Promise<PushPermission>;
  // Kicks off native registration. Mobile: APNs `didRegisterForRemoteNotifications`;
  // web: pushManager.subscribe(). Rejects on user denial, timeout, or transport error.
  subscribe(signal?: AbortSignal): Promise<PushSubscription>;
  unsubscribe(): Promise<void>;
  // Foreground notification stream. Returns an unsubscribe function.
  onNotification(handler: (payload: PushNotificationPayload) => void): () => void;
  // Cold-start payload (tap from terminated state). null if the app was
  // launched from the icon. Safe to call more than once.
  getInitialNotification(): Promise<PushNotificationPayload | null>;
  clearAllDelivered(): void;
};
