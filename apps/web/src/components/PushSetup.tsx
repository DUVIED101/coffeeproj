"use client";

import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NotificationService } from "@bystrobarista/core/services/NotificationService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import { useTutorialStore } from "@bystrobarista/core/stores/tutorialStore";
import type { UserId } from "@bystrobarista/core/types/ids";
import type { PushNotificationPayload } from "@bystrobarista/core/types/notification";
import { notificationHref } from "@/lib/notificationRoute";
import {
  isIosWithoutHomeScreenInstall,
  isWebPushSupported,
  registerServiceWorker,
} from "@/platform/push";

const SNOOZE_KEY = "bb_push_prompt_snoozed_until";
const SNOOZE_DAYS = 14;

const isSnoozed = (): boolean => {
  try {
    const until = Number(window.localStorage.getItem(SNOOZE_KEY) ?? 0);
    return until > Date.now();
  } catch {
    return false;
  }
};

const snooze = (): void => {
  try {
    window.localStorage.setItem(
      SNOOZE_KEY,
      String(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000),
    );
  } catch {
    // private mode — the prompt simply shows again next visit
  }
};

// Web twin of mobile's useNotificationSetup: registers the service worker,
// re-registers an already-granted subscription on every login (fresh keys +
// last_seen_at), routes notification clicks, and shows the soft prompt —
// asking in-app first keeps opt-in far above a cold native permission dialog.
export function PushSetup(): React.JSX.Element | null {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id as UserId | undefined;
  const accountType = user?.accountType;
  const [showPrompt, setShowPrompt] = useState(false);
  const tutorialActive = useTutorialStore((s) => s.status === "active");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId || !isWebPushSupported()) return;
    const controller = new AbortController();
    void registerServiceWorker().catch(() => null);

    if (Notification.permission === "granted") {
      NotificationService.registerDevice(userId, controller.signal).catch(
        (err: unknown) => {
          if ((err as Error)?.name !== "AbortError") {
            console.warn("registerDevice failed:", err);
          }
        },
      );
    } else if (
      Notification.permission === "default" &&
      !isSnoozed() &&
      !isIosWithoutHomeScreenInstall()
    ) {
      setShowPrompt(true);
    }
    return () => controller.abort();
  }, [userId]);

  useEffect(() => {
    if (!accountType || !isWebPushSupported()) return;
    return NotificationService.onNotification(
      (payload: PushNotificationPayload) => {
        const action =
          payload.actionIdentifier === "JOB_OFFER_ACCEPT"
            ? "accepted"
            : payload.actionIdentifier === "JOB_OFFER_DECLINE"
              ? "declined"
              : undefined;
        router.push(
          notificationHref(
            {
              kind: payload.kind,
              data: payload.data ?? { kind: payload.kind },
            },
            accountType,
            action,
          ),
        );
      },
    );
  }, [accountType, router]);

  const handleEnable = useCallback(async () => {
    if (!userId) return;
    setBusy(true);
    try {
      const granted = await NotificationService.requestPermission();
      if (granted) await NotificationService.registerDevice(userId);
    } catch (err) {
      console.warn("push opt-in failed:", err);
    } finally {
      setBusy(false);
      setShowPrompt(false);
      snooze();
    }
  }, [userId]);

  if (!showPrompt || tutorialActive) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      className="mx-auto mb-4 max-w-5xl rounded-card border border-line bg-white p-4 shadow-sm"
    >
      <p className="font-semibold">{t("push.prompt.title")}</p>
      <p className="mt-1 text-sm text-ink-secondary">{t("push.prompt.body")}</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void handleEnable()}
          disabled={busy}
          className="rounded-input bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {t("push.prompt.enable")}
        </button>
        <button
          type="button"
          onClick={() => {
            snooze();
            setShowPrompt(false);
          }}
          className="rounded-input border border-line px-4 py-2 text-sm font-medium"
        >
          {t("push.prompt.later")}
        </button>
      </div>
    </div>
  );
}
