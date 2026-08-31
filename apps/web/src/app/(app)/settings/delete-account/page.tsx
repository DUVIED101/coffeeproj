"use client";

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BusinessService } from "@bystrobarista/core/services/BusinessService";
import { JobService } from "@bystrobarista/core/services/JobService";
import { AuthService } from "@bystrobarista/core/services/AuthService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import {
  hasPasswordAuth,
  isAppleOnlyUser,
} from "@bystrobarista/core/utils/authProvider";
import { STABLE_STORAGE_KEY } from "@bystrobarista/core/config/authStorage";
import { webStorage } from "@/platform/storage";

// Port of DeleteAccountScreen. Two of mobile's three re-auth paths work on
// web: current password (email accounts) and emailed OTP (Google/Yandex).
// Apple SIWA re-auth needs the native flow — web points those users at the
// iOS app until Phase 7 lands Sign in with Apple JS.
export default function DeleteAccountPage(): React.JSX.Element {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);

  const passwordPath = hasPasswordAuth(session);
  const appleOnly = isAppleOnlyUser(session);
  const otpPath = !passwordPath && !appleOnly;

  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [forceChecked, setForceChecked] = useState(false);
  const [activeJobsCount, setActiveJobsCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const expectedKeyword = t("settings.delete.confirmKeyword");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (user?.accountType !== "business") return;
      try {
        const business = await BusinessService.getBusinessByOwnerId(user.id);
        if (!business) return;
        const jobs = await JobService.getJobsByBusinessId(business.id);
        if (cancelled) return;
        setActiveJobsCount(
          jobs.filter(
            (job) => job.status === "open" || job.status === "in_review",
          ).length,
        );
      } catch (err) {
        console.error("Error checking active jobs:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSendOtp = async (): Promise<void> => {
    setError(null);
    try {
      await AuthService.requestDeletionOtp();
      setOtpSent(true);
    } catch (err) {
      console.error("requestDeletionOtp failed:", err);
      setError(t("settings.delete.otpSendFailed"));
    }
  };

  const credentialsReady = passwordPath
    ? password.length > 0
    : otpPath
      ? otpCode.trim().length === 6
      : false;
  const canSubmit =
    !appleOnly &&
    credentialsReady &&
    confirmText === expectedKeyword &&
    (activeJobsCount === 0 || forceChecked) &&
    !isSubmitting;

  const handleDelete = async (): Promise<void> => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    const force = activeJobsCount > 0 ? true : undefined;
    try {
      await useAuthStore
        .getState()
        .deleteAccount(
          passwordPath
            ? { password, force }
            : { otpCode: otpCode.trim(), force },
        );
      await webStorage.removeItem(STABLE_STORAGE_KEY);
      window.location.assign("/auth/login");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === "invalid_password") {
        setError(t("settings.delete.invalidPassword"));
      } else if (message === "invalid_otp") {
        setError(t("settings.delete.invalidOtp"));
      } else if (message.startsWith("active_jobs:")) {
        const count = Number(message.split(":")[1]) || activeJobsCount;
        setActiveJobsCount(count);
        setForceChecked(false);
        setError(t("settings.delete.activeJobsWarning", { count }));
      } else if (
        message === "cascade_incomplete" ||
        message === "auth_delete_failed"
      ) {
        setError(t("settings.delete.partialDeletion"));
      } else {
        setError(t("common.tryAgain"));
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-bold text-error">
        {t("settings.delete.title")}
      </h1>
      <p className="mb-6 text-sm text-ink-secondary">
        {t("settings.delete.warning")}
      </p>

      {appleOnly ? (
        <p className="rounded-card bg-bg-secondary p-4 text-sm">
          {t("settings.delete.appleUseMobile")}
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleDelete();
          }}
          className="flex flex-col gap-4"
        >
          {activeJobsCount > 0 && (
            <div className="rounded-card border border-[#FCD34D] bg-[#FEF3C7] p-4">
              <p className="mb-2 text-sm text-[#92400E]">
                {t("settings.delete.activeJobsWarning", {
                  count: activeJobsCount,
                })}
              </p>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[#92400E]">
                <input
                  type="checkbox"
                  checked={forceChecked}
                  onChange={(e) => setForceChecked(e.target.checked)}
                  className="h-4 w-4 accent-[#92400E]"
                />
                {t("settings.delete.forceCheckbox")}
              </label>
            </div>
          )}

          {passwordPath && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium">
                {t("settings.delete.passwordLabel")}
              </span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-input border border-line p-2.5 text-sm"
              />
            </label>
          )}

          {otpPath && (
            <div>
              <p className="mb-2 text-sm text-ink-secondary">
                {t("settings.delete.otpHelper")}
              </p>
              {otpSent ? (
                <>
                  <p className="mb-2 text-sm text-success">
                    {t("settings.delete.otpSent", {
                      email: user?.email ?? "",
                    })}
                  </p>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">
                      {t("settings.delete.otpLabel")}
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) =>
                        setOtpCode(e.target.value.replace(/\D/g, ""))
                      }
                      className="w-full rounded-input border border-line p-2.5 text-sm tracking-widest"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleSendOtp()}
                    className="mt-2 text-sm font-medium text-primary"
                  >
                    {t("settings.delete.resendOtp")}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleSendOtp()}
                  className="rounded-input border border-line px-4 py-2 text-sm font-medium"
                >
                  {t("settings.delete.sendOtp")}
                </button>
              )}
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              {t("settings.delete.typeToConfirm", {
                keyword: expectedKeyword,
              })}
            </span>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full rounded-input border border-line p-2.5 text-sm"
            />
          </label>

          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-card bg-error px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t("settings.delete.submit")}
          </button>
        </form>
      )}
    </div>
  );
}
