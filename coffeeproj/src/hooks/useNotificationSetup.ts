import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
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
    if (!user?.id) return;

    const controller = new AbortController();
    let cleanupHandler: (() => void) | undefined;

    (async () => {
      try {
        const granted = await NotificationService.requestPermission();
        if (!granted || controller.signal.aborted) return;
        await NotificationService.registerDevice(user.id as UserId, controller.signal);
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          console.warn('registerDevice failed:', err);
        }
        return;
      }
      if (onNotification && !controller.signal.aborted) {
        cleanupHandler = NotificationService.onNotification(onNotification);
      }
    })();

    return () => {
      controller.abort();
      cleanupHandler?.();
    };
  }, [user?.id, onNotification]);
};
