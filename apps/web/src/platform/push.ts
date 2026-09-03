import type {
  PushAdapter,
  PushSubscription,
} from "@bystrobarista/core/platform/push";
import type {
  DeviceToken,
  NotificationKind,
  PushNotificationPayload,
} from "@bystrobarista/core/types/notification";

const SW_URL = "/sw.js";

export const isWebPushSupported = (): boolean =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

// iOS Safari only exposes Web Push to sites installed on the Home Screen
// (16.4+). Detect the "browser tab on iPhone" case so the UI can explain.
export const isIosWithoutHomeScreenInstall = (): boolean => {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPhone|iPad|iPod/.test(ua);
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true;
  return isIos && !standalone;
};

// Backed by a plain ArrayBuffer (not ArrayBufferLike) so it satisfies the
// DOM lib's BufferSource for pushManager.subscribe.
const urlBase64ToUint8Array = (base64: string): Uint8Array<ArrayBuffer> => {
  const padded =
    base64.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
};

const sameKey = (a: ArrayBuffer | null, b: Uint8Array): boolean => {
  if (!a || a.byteLength !== b.byteLength) return false;
  const av = new Uint8Array(a);
  return av.every((byte, i) => byte === b[i]);
};

export const registerServiceWorker =
  async (): Promise<ServiceWorkerRegistration | null> => {
    if (!isWebPushSupported()) return null;
    await navigator.serviceWorker.register(SW_URL);
    return navigator.serviceWorker.ready;
  };

export const getCurrentSubscriptionEndpoint = async (): Promise<
  string | null
> => {
  if (!isWebPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration(SW_URL);
  const subscription = await registration?.pushManager.getSubscription();
  return subscription?.endpoint ?? null;
};

// Message posted by sw.js on notification click: { type: "PUSH_ROUTE", url }.
type PushRouteMessage = { type: "PUSH_ROUTE"; url: string };

const toPayload = (url: string): PushNotificationPayload => {
  const params = new URL(url, window.location.origin).searchParams;
  const kind = (params.get("kind") ?? "new_message") as NotificationKind;
  const action = params.get("action");
  return {
    kind,
    userInteraction: true,
    actionIdentifier:
      action === "accepted"
        ? "JOB_OFFER_ACCEPT"
        : action === "declined"
          ? "JOB_OFFER_DECLINE"
          : undefined,
    data: {
      kind,
      applicationId: (params.get("applicationId") ?? undefined) as never,
      conversationId: (params.get("conversationId") ?? undefined) as never,
      jobId: (params.get("jobId") ?? undefined) as never,
      offerId: (params.get("offerId") ?? undefined) as never,
      disputeId: (params.get("disputeId") ?? undefined) as never,
      jobTitle: params.get("jobTitle") ?? undefined,
      shiftStartIso: params.get("shiftStartIso") ?? undefined,
    },
  };
};

export const webPush: PushAdapter = {
  async requestPermission() {
    if (!isWebPushSupported()) return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  },

  async checkPermission() {
    if (typeof Notification === "undefined") return "denied";
    return Notification.permission;
  },

  async subscribe(signal?: AbortSignal): Promise<PushSubscription> {
    if (!isWebPushSupported()) throw new Error("Web Push is not supported");
    if (Notification.permission !== "granted") {
      throw new Error("Notification permission not granted");
    }
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey)
      throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY not set");
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    const registration = await registerServiceWorker();
    if (!registration) throw new Error("Service worker registration failed");
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    let subscription = await registration.pushManager.getSubscription();
    // A subscription minted for a rotated VAPID key is dead weight — drop it
    // and subscribe afresh so the send side can authenticate.
    if (
      subscription &&
      !sameKey(subscription.options.applicationServerKey, applicationServerKey)
    ) {
      await subscription.unsubscribe();
      subscription = null;
    }
    subscription ??= await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    const keys = subscription.toJSON().keys;
    if (!keys?.p256dh || !keys.auth) {
      throw new Error("Push subscription has no keys");
    }
    return {
      token: subscription.endpoint as DeviceToken,
      environment: "web",
      webPushKeys: { p256dh: keys.p256dh, auth: keys.auth },
    };
  },

  async unsubscribe() {
    if (!isWebPushSupported()) return;
    const registration = await navigator.serviceWorker.getRegistration(SW_URL);
    const subscription = await registration?.pushManager.getSubscription();
    await subscription?.unsubscribe();
  },

  onNotification(handler) {
    if (!isWebPushSupported()) return () => undefined;
    const listener = (event: MessageEvent<PushRouteMessage>): void => {
      if (event.data?.type !== "PUSH_ROUTE" || !event.data.url) return;
      handler(toPayload(event.data.url));
    };
    navigator.serviceWorker.addEventListener("message", listener);
    return () =>
      navigator.serviceWorker.removeEventListener("message", listener);
  },

  async getInitialNotification() {
    // Cold-start taps land on /push via openWindow — no queued payload needed.
    return null;
  },

  clearAllDelivered() {
    if (!isWebPushSupported()) return;
    void navigator.serviceWorker
      .getRegistration(SW_URL)
      .then((registration) => registration?.getNotifications())
      .then((notifications) => notifications?.forEach((n) => n.close()))
      .catch(() => {});
  },
};
