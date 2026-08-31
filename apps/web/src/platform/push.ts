import type { PushAdapter } from "@bystrobarista/core/platform/push";

// Web Push lands in Phase 6 (service worker + VAPID + send-push edge
// function). Until then the adapter reports "no push available" so core's
// registration paths no-op gracefully instead of crashing.
export const webPush: PushAdapter = {
  async requestPermission() {
    return false;
  },
  async checkPermission() {
    if (typeof Notification === "undefined") return "denied";
    return Notification.permission;
  },
  async subscribe() {
    throw new Error("Web Push not implemented yet (Phase 6)");
  },
  async unsubscribe() {
    // nothing registered yet
  },
  onNotification() {
    return () => undefined;
  },
  async getInitialNotification() {
    return null;
  },
  clearAllDelivered() {
    // Notification Center management is not available to web pages.
  },
};
