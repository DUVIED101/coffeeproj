"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import type { Notification } from "@bystrobarista/core/types/notification";
import { notificationHref } from "@/lib/notificationRoute";
import { useNotificationFeedStore } from "@/stores/notificationFeedStore";

const TOAST_MS = 7000;

// In-app banner for notifications that arrive while the tab is open — the
// web counterpart of mobile's foreground toast. Push handles hidden tabs, so
// this only fires for a visible tab, and stays quiet when the user is already
// looking at the notification's destination (e.g. that very chat).
export function NotificationToastHost(): React.JSX.Element | null {
  const { t } = useTranslation();
  const router = useRouter();
  const accountType = useAuthStore((s) => s.user?.accountType);
  const incoming = useNotificationFeedStore((s) => s.lastIncoming);
  const [toast, setToast] = useState<Notification | null>(null);

  useEffect(() => {
    if (!incoming || incoming.readAt || !accountType) return;
    if (document.visibilityState !== "visible") return;
    const href = notificationHref(
      { kind: incoming.kind, data: incoming.data },
      accountType,
    );
    if (window.location.pathname === href.split("?")[0]) return;
    setToast(incoming);
    const timer = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [incoming, accountType]);

  if (!toast || !accountType) return null;

  const href = notificationHref(
    { kind: toast.kind, data: toast.data },
    accountType,
  );

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm items-start gap-2 rounded-card border border-line bg-white p-3 shadow-lg md:bottom-6"
    >
      <button
        type="button"
        onClick={() => {
          setToast(null);
          router.push(href);
        }}
        className="min-w-0 flex-1 text-left"
      >
        <p className="truncate text-sm font-semibold">
          {toast.title ?? t("notifications.toast.fallbackTitle")}
        </p>
        {toast.body && (
          <p className="mt-0.5 line-clamp-2 text-sm text-ink-secondary">
            {toast.body}
          </p>
        )}
      </button>
      <button
        type="button"
        onClick={() => setToast(null)}
        aria-label={t("common.close")}
        className="shrink-0 rounded-input px-1 text-ink-secondary hover:text-ink"
      >
        ✕
      </button>
    </div>
  );
}
