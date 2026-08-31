"use client";

import { useEffect } from "react";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import type { UserId } from "@bystrobarista/core/types/ids";
import { useNotificationFeedStore } from "@/stores/notificationFeedStore";

// Headless: loads the feed once per session, keeps the bell badge fresh via
// realtime inserts, and resubscribes when the tab wakes up (the WebSocket may
// have died while it slept). Mounted once in the (app) layout.
export function NotificationFeedWatcher(): null {
  const userId = useAuthStore((s) => s.user?.id) as UserId | undefined;

  useEffect(() => {
    const store = useNotificationFeedStore.getState();
    if (!userId) {
      store.reset();
      return;
    }
    void store.load(userId).catch(() => {});
    store.startRealtime(userId);

    const onVisible = (): void => {
      if (document.visibilityState !== "visible") return;
      const s = useNotificationFeedStore.getState();
      s.stopRealtime();
      s.startRealtime(userId);
      void s.load(userId).catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      useNotificationFeedStore.getState().stopRealtime();
    };
  }, [userId]);

  return null;
}
