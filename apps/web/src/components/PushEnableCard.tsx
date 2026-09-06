"use client";

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NotificationService } from "@bystrobarista/core/services/NotificationService";
import type { UserId } from "@bystrobarista/core/types/ids";
import {
  isIosWithoutHomeScreenInstall,
  isWebPushSupported,
} from "@/platform/push";

// Always-available entry point for browser push, independent of the one-time
// soft prompt (which the first-run tutorial can hide and a "later" click
// snoozes for two weeks). Shown on the notifications page while permission
// has not been decided.
export function PushEnableCard({
  userId,
}: {
  userId: UserId;
}): React.JSX.Element | null {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setVisible(
      isWebPushSupported() &&
        Notification.permission === "default" &&
        !isIosWithoutHomeScreenInstall(),
    );
  }, []);

  if (!visible) return null;

  const enable = async (): Promise<void> => {
    setBusy(true);
    try {
      const granted = await NotificationService.requestPermission();
      if (granted) await NotificationService.registerDevice(userId);
    } catch (err) {
      console.warn("push opt-in failed:", err);
    } finally {
      setBusy(false);
      setVisible(Notification.permission === "default");
    }
  };

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-white px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{t("push.prompt.title")}</p>
        <p className="text-xs text-ink-secondary">{t("push.prompt.body")}</p>
      </div>
      <button
        type="button"
        onClick={() => void enable()}
        disabled={busy}
        className="rounded-input bg-primary px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {t("push.prompt.enable")}
      </button>
    </div>
  );
}
