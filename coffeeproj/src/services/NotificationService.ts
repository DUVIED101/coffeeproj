// Phase 5.11 (deferred) stub. The real APNs implementation lives next to
// this file as `NotificationService.apns.ts.deferred`. When the project owner
// gets an Apple Developer account, follow docs/push-notifications-setup.md:
//   1. npm install @react-native-community/push-notification-ios
//   2. rename this file aside and rename the .deferred file back to
//      NotificationService.ts

import type { PushNotificationPayload } from '../types/notification';
import type { UserId } from '../types/ids';

let hasWarned = false;
const warnOnce = (): void => {
  if (hasWarned) return;
  hasWarned = true;
  console.warn(
    '[NotificationService] push notifications deferred (Phase 5.11) — all calls are no-ops'
  );
};

export class NotificationService {
  static async requestPermission(): Promise<boolean> {
    warnOnce();
    return false;
  }

  static async checkPermission(): Promise<boolean> {
    warnOnce();
    return false;
  }

  static async registerDevice(_userId: UserId, signal?: AbortSignal): Promise<void> {
    warnOnce();
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
  }

  static async unregisterDevice(_userId: UserId): Promise<void> {
    warnOnce();
  }

  static onNotification(_handler: (notification: PushNotificationPayload) => void): () => void {
    warnOnce();
    return () => {};
  }
}
