"use client";

import { useEffect } from "react";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import type { UserId } from "@bystrobarista/core/types/ids";
import { useNotificationFeedStore } from "@/stores/notificationFeedStore";

const POLL_INTERVAL_MS = 60_000;

// Headless: loads the feed once per session, keeps the bell badge fresh via
// realtime inserts while the tab is visible, and resubscribes when the tab
// wakes up. A hidden tab drops its channel instead of keeping a WebSocket and
// WAL polling busy for nobody. Mounted once in the (app) layout.
export function NotificationFeedWatcher(): null {
  const userId = useAuthStore((s) => s.user?.id) as UserId | undefined;

  useEffect(() => {
    const store = useNotificationFeedStore.getState();
    if (!userId) {
      store.reset();
      return;
    }
    void store.load(userId).catch(() => {});
    if (document.visibilityState === "visible") store.startRealtime(userId);

    const onVisibility = (): void => {
      const s = useNotificationFeedStore.getState();
      s.stopRealtime();
      if (document.visibilityState !== "visible") return;
      s.startRealtime(userId);
      void s.load(userId).catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisibility);

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
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(poll);
      useNotificationFeedStore.getState().stopRealtime();
    };
  }, [userId]);

  return null;
}
