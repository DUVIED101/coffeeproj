"use client";

import { useEffect } from "react";
import { ChatService } from "@bystrobarista/core/services/ChatService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import { useChatUnreadStore } from "@bystrobarista/core/stores/chatUnreadStore";

// Headless: keeps the chat unread badge fresh — initial fetch, realtime
// conversation-row updates, and a refetch when the tab wakes up (the
// WebSocket may have died while it slept). Mounted once in the (app) layout.
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
    doRefresh();
    const teardown = ChatService.subscribeToUnreadChanges(
      userId,
      accountType,
      doRefresh,
    );
    const onVisible = (): void => {
      if (document.visibilityState === "visible") doRefresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      teardown();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId, accountType, refresh, reset]);

  return null;
}
