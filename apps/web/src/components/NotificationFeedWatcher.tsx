"use client";

import { useEffect } from "react";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import type { UserId } from "@bystrobarista/core/types/ids";
import { useNotificationFeedStore } from "@/stores/notificationFeedStore";

const POLL_INTERVAL_MS = 60_000;

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

    // Push isn't guaranteed (denied, unsupported, iOS tab): poll the unread
    // count while the tab is visible so the bell can't drift for long even
    // if the realtime socket silently died.
    const pushGranted = (): boolean =>
      typeof Notification !== "undefined" &&
      Notification.permission === "granted";
    const poll = window.setInterval(() => {
      if (document.visibilityState !== "visible" || pushGranted()) return;
      void useNotificationFeedStore
        .getState()
        .refreshUnreadCount(userId)
        .catch(() => {});
    }, POLL_INTERVAL_MS);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(poll);
      useNotificationFeedStore.getState().stopRealtime();
    };
  }, [userId]);

  return null;
}
