"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import type { ReportTargetType } from "@bystrobarista/core/types/userReport";
import { ReportDialog } from "@/components/ReportDialog";

type Props = {
  targetType: ReportTargetType;
  targetId: string;
  variant?: "inline" | "icon";
};

// Web port of mobile's ReportButton: a "Пожаловаться" trigger that opens the
// report dialog. Hidden for banned or currently-suspended accounts, whose
// reports the backend would refuse anyway.
export function ReportButton({
  targetType,
  targetId,
  variant = "inline",
}: Props): React.JSX.Element | null {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);

  if (user?.bannedAt) return null;
  if (
    user?.suspendedUntil &&
    new Date(user.suspendedUntil).getTime() > Date.now()
  ) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          variant === "icon"
            ? "text-xs text-ink-secondary underline underline-offset-2 hover:text-ink"
            : "rounded-input border border-line px-3 py-2 text-xs text-ink-secondary hover:text-ink"
        }
      >
        {t("report.buttonLabel")}
      </button>
      {open && (
        <ReportDialog
          target={{ type: targetType, id: targetId }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
