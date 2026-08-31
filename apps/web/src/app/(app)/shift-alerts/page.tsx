"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApplicationService } from "@bystrobarista/core/services/ApplicationService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";

const REASON_MAX = 300;
const TICK_MS = 60_000;

const formatRemaining = (ms: number): string => {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} ч ${minutes} мин` : `${minutes} мин`;
};

// Web port of mobile's ShiftAlertScreen: the barista hasn't confirmed the
// upcoming shift — show the countdown and let the business cancel the shift
// (with an optional reason) or keep waiting. Opened from the accepted-shift
// countdown banner with query params.
function ShiftAlertContent(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);

  const applicationId = searchParams.get("applicationId") ?? "";
  const jobTitle = searchParams.get("jobTitle") ?? "";
  const shiftStartIso = searchParams.get("shiftStart") ?? "";

  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(interval);
  }, []);

  const remainingMs = shiftStartIso
    ? new Date(shiftStartIso).getTime() - now
    : 0;

  const handleCancel = async (): Promise<void> => {
    if (!user?.id || !applicationId) return;
    if (!window.confirm(t("applications.cancelShift.confirmBody"))) return;
    setBusy(true);
    setError(null);
    try {
      await ApplicationService.cancelAcceptedShiftAsBusiness(
        applicationId as import("@bystrobarista/core/types/ids").ApplicationId,
        user.id,
        reason.trim() ? reason.trim() : undefined,
      );
      router.back();
    } catch {
      setError(t("common.tryAgain"));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg pb-16">
      <h1 className="text-2xl font-bold">
        {t("shifts.noResponseAlert.screenTitle")}
      </h1>
      {jobTitle && (
        <p className="mt-2 text-lg font-semibold text-primary">{jobTitle}</p>
      )}
      <p className="mt-2 text-sm text-ink-secondary">
        {t("shifts.noResponseAlert.screenBody", {
          remaining: formatRemaining(remainingMs),
        })}
      </p>

      <label className="mt-6 flex flex-col gap-1.5">
        <span className="text-sm font-medium">
          {t("shifts.noResponseAlert.reasonLabel")}
        </span>
        <textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, REASON_MAX))}
          placeholder={t("shifts.noResponseAlert.reasonLabel")}
          className="rounded-input border border-line px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </label>

      {error && (
        <p role="alert" className="mt-3 text-sm text-error">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleCancel()}
          className="rounded-card bg-error px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {t("shifts.noResponseAlert.cancelAction")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => router.back()}
          className="rounded-card border border-primary px-4 py-2.5 text-sm font-semibold text-primary disabled:opacity-50"
        >
          {t("shifts.noResponseAlert.waitAction")}
        </button>
      </div>
    </div>
  );
}

export default function ShiftAlertPage(): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <ShiftAlertContent />
    </Suspense>
  );
}
