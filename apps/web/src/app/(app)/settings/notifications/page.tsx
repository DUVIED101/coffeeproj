"use client";

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NotificationPreferencesService } from "@bystrobarista/core/services/NotificationPreferencesService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import type { UserId } from "@bystrobarista/core/types/ids";
import type { UpdateNotificationPreferences } from "@bystrobarista/core/types/notificationPreferences";
import { getPlatform } from "@bystrobarista/core/platform";

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
