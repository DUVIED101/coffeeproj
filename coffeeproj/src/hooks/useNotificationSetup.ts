import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useNotificationFeedStore } from '../stores/notificationFeedStore';
import { NotificationService } from '../services/NotificationService';
import type { PushNotificationPayload } from '../types/notification';
import type { UserId } from '../types/ids';

type Options = {
  onNotification?: (payload: PushNotificationPayload) => void;
};

export const useNotificationSetup = (opts?: Options): void => {
  const user = useAuthStore(s => s.user);
  const onNotification = opts?.onNotification;

  useEffect(() => {
    if (!user?.id) {
      useNotificationFeedStore.getState().reset();
      return;
    }

    const userId = user.id as UserId;
    const controller = new AbortController();
    let cleanupHandler: (() => void) | undefined;

    // Boot the in-app feed alongside push registration so the bell badge is
    // accurate on the very first render after login.
    const feed = useNotificationFeedStore.getState();
    feed.load(userId).catch(err => console.warn('initial notification load failed:', err));
    feed.startRealtime(userId);

    (async () => {
      try {
        const granted = await NotificationService.requestPermission();
        if (!granted || controller.signal.aborted) return;
        await NotificationService.registerDevice(userId, controller.signal);
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          console.warn('registerDevice failed:', err);
        }
        return;
      }
      if (onNotification && !controller.signal.aborted) {
        cleanupHandler = NotificationService.onNotification(onNotification);

        // Cold-start: if the app was launched by tapping a notification,
        // route it now (queued in navigationRef until NavigationContainer is ready).
        const initial = await NotificationService.getInitialNotification();
        if (initial && !controller.signal.aborted) {
          onNotification(initial);
        }
      }
    })();

    return () => {
      controller.abort();
      cleanupHandler?.();
      useNotificationFeedStore.getState().stopRealtime();
    };
  }, [user?.id, onNotification]);
};
