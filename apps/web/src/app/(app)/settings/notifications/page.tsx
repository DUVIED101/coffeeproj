"use client";

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NotificationPreferencesService } from "@bystrobarista/core/services/NotificationPreferencesService";
import { NotificationService } from "@bystrobarista/core/services/NotificationService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import type { UserId } from "@bystrobarista/core/types/ids";
import type { DeviceToken } from "@bystrobarista/core/types/notification";
import type { UpdateNotificationPreferences } from "@bystrobarista/core/types/notificationPreferences";
import { getPlatform } from "@bystrobarista/core/platform";
import {
  getCurrentSubscriptionEndpoint,
  isIosWithoutHomeScreenInstall,
  isWebPushSupported,
} from "@/platform/push";

type PushStatus = "unsupported" | "blocked" | "enabled" | "disabled";

// Browser-level push switch — the per-kind toggles below apply to every
// device; this row controls whether THIS browser is a delivery target.
function BrowserPushCard({ userId }: { userId: UserId }): React.JSX.Element {
  const { t } = useTranslation();
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const iosHint = isIosWithoutHomeScreenInstall();

  const refresh = async (): Promise<void> => {
    if (!isWebPushSupported()) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("blocked");
      return;
    }
    const current = await getCurrentSubscriptionEndpoint();
    setEndpoint(current);
    setStatus(current ? "enabled" : "disabled");
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleEnable = async (): Promise<void> => {
    setBusy(true);
    setFailed(false);
    try {
      const granted = await NotificationService.requestPermission();
      if (!granted) {
        setFailed(Notification.permission !== "denied");
        return;
      }
      await NotificationService.registerDevice(userId);
    } catch (err) {
      console.warn("enable push failed:", err);
      setFailed(true);
    } finally {
      setBusy(false);
      await refresh();
    }
  };

  const handleDisable = async (): Promise<void> => {
    setBusy(true);
    try {
      await NotificationService.unregisterDevice(
        userId,
        (endpoint ?? undefined) as DeviceToken | undefined,
      );
    } finally {
      setBusy(false);
      await refresh();
    }
  };

  const statusLabel =
    status === "unsupported"
      ? t("push.settings.unsupported")
      : status === "blocked"
        ? t("push.settings.blocked")
        : status === "enabled"
          ? t("push.settings.enabled")
          : status === "disabled"
            ? t("push.settings.disabled")
            : "";

  return (
    <div className="mb-4 rounded-card border border-line bg-white px-4 py-3">
      <div className="flex min-h-[44px] items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm">{t("push.settings.label")}</p>
          <p className="text-xs text-ink-secondary">{statusLabel}</p>
        </div>
        {status === "enabled" && (
          <button
            type="button"
            onClick={() => void handleDisable()}
            disabled={busy}
            className="shrink-0 rounded-input border border-line px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            {t("push.settings.disable")}
          </button>
        )}
        {status === "disabled" && !iosHint && (
          <button
            type="button"
            onClick={() => void handleEnable()}
            disabled={busy}
            className="shrink-0 rounded-input bg-primary px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t("push.settings.enable")}
          </button>
        )}
      </div>
      {iosHint && status !== "enabled" && (
        <p className="mt-2 text-xs text-ink-secondary">
          {t("push.settings.iosInstallHint")}
        </p>
      )}
      {failed && (
        <p role="alert" className="mt-2 text-xs text-error">
          {t("push.settings.failed")}
        </p>
      )}
    </div>
  );
}

type PrefKey = keyof UpdateNotificationPreferences;

type PrefsState = Record<PrefKey, boolean>;

const DEFAULT_PREFS: PrefsState = {
  newMessage: true,
  applicationAccepted: true,
  applicationRejected: true,
  newApplication: true,
  applicationWithdrawn: true,
  shiftCancelled: true,
  newReview: true,
  conversationStarted: true,
  jobOfferReceived: true,
  jobOfferAccepted: true,
  jobOfferDeclined: true,
  workCompletionRequested: true,
  workCompletionConfirmed: true,
};

type PrefRow = { key: PrefKey; labelKey: string };

// Mobile parity: role-specific toggle sets and ordering.
const BARISTA_PREF_ROWS: ReadonlyArray<PrefRow> = [
  { key: "newMessage", labelKey: "settings.notifications.newMessage" },
  {
    key: "conversationStarted",
    labelKey: "settings.notifications.conversationStarted",
  },
  {
    key: "jobOfferReceived",
    labelKey: "settings.notifications.jobOfferReceived",
  },
  {
    key: "applicationAccepted",
    labelKey: "settings.notifications.applicationAccepted",
  },
  {
    key: "applicationRejected",
    labelKey: "settings.notifications.applicationRejected",
  },
  {
    key: "workCompletionConfirmed",
    labelKey: "settings.notifications.workCompletionConfirmed",
  },
  { key: "shiftCancelled", labelKey: "settings.notifications.shiftCancelled" },
  { key: "newReview", labelKey: "settings.notifications.newReview" },
];

const BUSINESS_PREF_ROWS: ReadonlyArray<PrefRow> = [
  { key: "newMessage", labelKey: "settings.notifications.newMessage" },
  {
    key: "conversationStarted",
    labelKey: "settings.notifications.conversationStarted",
  },
  { key: "newApplication", labelKey: "settings.notifications.newApplication" },
  {
    key: "applicationWithdrawn",
    labelKey: "settings.notifications.applicationWithdrawn",
  },
  {
    key: "jobOfferAccepted",
    labelKey: "settings.notifications.jobOfferAccepted",
  },
  {
    key: "jobOfferDeclined",
    labelKey: "settings.notifications.jobOfferDeclined",
  },
  {
    key: "workCompletionRequested",
    labelKey: "settings.notifications.workCompletionRequested",
  },
  { key: "shiftCancelled", labelKey: "settings.notifications.shiftCancelled" },
  { key: "newReview", labelKey: "settings.notifications.newReview" },
];

export default function NotificationSettingsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.user?.id);
  const accountType = useAuthStore((s) => s.user?.accountType);
  const prefRows =
    accountType === "business" ? BUSINESS_PREF_ROWS : BARISTA_PREF_ROWS;

  const [prefs, setPrefs] = useState<PrefsState>(DEFAULT_PREFS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }
      try {
        const loaded = await NotificationPreferencesService.getPreferences(
          userId as UserId,
        );
        if (!cancelled && loaded) {
          setPrefs({
            newMessage: loaded.newMessage,
            applicationAccepted: loaded.applicationAccepted,
            applicationRejected: loaded.applicationRejected,
            newApplication: loaded.newApplication,
            applicationWithdrawn: loaded.applicationWithdrawn,
            shiftCancelled: loaded.shiftCancelled,
            newReview: loaded.newReview,
            conversationStarted: loaded.conversationStarted,
            jobOfferReceived: loaded.jobOfferReceived,
            jobOfferAccepted: loaded.jobOfferAccepted,
            jobOfferDeclined: loaded.jobOfferDeclined,
            workCompletionRequested: loaded.workCompletionRequested,
            workCompletionConfirmed: loaded.workCompletionConfirmed,
          });
        }
      } catch (err) {
        console.error("Error loading notification preferences:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleToggle = async (key: PrefKey, value: boolean): Promise<void> => {
    if (!userId) return;
    const previous = prefs[key];
    setPrefs((s) => ({ ...s, [key]: value }));
    try {
      await NotificationPreferencesService.upsertPreferences(userId as UserId, {
        [key]: value,
      });
    } catch (err) {
      console.error("Error in upsertPreferences:", err);
      setPrefs((s) => ({ ...s, [key]: previous }));
      getPlatform().alert.show(t("common.error"), t("common.retry"));
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold">
          {t("settings.notifications.title")}
        </h1>
        <div className="h-96 animate-pulse rounded-card bg-bg-secondary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">
        {t("settings.notifications.title")}
      </h1>
      {userId && <BrowserPushCard userId={userId as UserId} />}
      <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-white">
        {prefRows.map((row) => (
          <label
            key={row.key}
            className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3 px-4 py-3"
          >
            <span className="text-sm">{t(row.labelKey)}</span>
            <input
              type="checkbox"
              checked={prefs[row.key]}
              onChange={(e) => void handleToggle(row.key, e.target.checked)}
              className="h-5 w-5 accent-primary"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
