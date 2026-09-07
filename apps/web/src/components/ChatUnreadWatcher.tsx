"use client";

import { useEffect } from "react";
import { ChatService } from "@bystrobarista/core/services/ChatService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import { useChatUnreadStore } from "@bystrobarista/core/stores/chatUnreadStore";

// Headless: keeps the chat unread badge fresh — initial fetch, realtime
// conversation-row updates while the tab is visible, and a refetch when the
// tab wakes up. A hidden tab drops its channel: it would only keep a
// WebSocket and WAL polling busy for nobody. Mounted once in the (app) layout.
export function ChatUnreadWatcher(): null {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const accountType = user?.accountType;
  const refresh = useChatUnreadStore((s) => s.refresh);
  const reset = useChatUnreadStore((s) => s.reset);

  useEffect(() => {
    if (!userId || !accountType) {
      reset();
      return;
    }
    const doRefresh = (): void => {
      void refresh(userId, accountType).catch(() => {});
    };
    let teardown: (() => void) | null = null;
    const listen = (): void => {
      if (!teardown) {
        teardown = ChatService.subscribeToUnreadChanges(
          userId,
          accountType,
          doRefresh,
        );
      }
    };
    const stopListening = (): void => {
      teardown?.();
      teardown = null;
    };
    const onVisibility = (): void => {
      if (document.visibilityState === "visible") {
        doRefresh();
        listen();
      } else {
        stopListening();
      }
    };
    doRefresh();
    if (document.visibilityState === "visible") listen();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopListening();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [userId, accountType, refresh, reset]);

  return null;
}
