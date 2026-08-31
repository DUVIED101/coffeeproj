"use client";

import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AuthService } from "@bystrobarista/core/services/AuthService";
import { getPlatform } from "@bystrobarista/core/platform";

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;

export default function ChangePasswordPage(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [newError, setNewError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const newPasswordError = useMemo<string | null>(() => {
    if (!newPassword) return null;
    if (
      newPassword.length < MIN_PASSWORD_LENGTH ||
      newPassword.length > MAX_PASSWORD_LENGTH
    ) {
      return t("settings.password.minLength");
    }
    if (newPassword === currentPassword) {
      return t("settings.password.sameAsCurrent");
    }
    return null;
  }, [newPassword, currentPassword, t]);

  const confirmError = useMemo<string | null>(() => {
    if (!confirmPassword) return null;
    if (confirmPassword !== newPassword) {
      return t("settings.password.mismatch");
    }
    return null;
  }, [confirmPassword, newPassword, t]);

  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length >= MIN_PASSWORD_LENGTH &&
    newPassword.length <= MAX_PASSWORD_LENGTH &&
    newPassword !== currentPassword &&
    confirmPassword === newPassword &&
    !isSubmitting;

  const handleSubmit = async (): Promise<void> => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setCurrentError(null);
    setNewError(null);
    try {
      await AuthService.changePassword(currentPassword, newPassword);
      getPlatform().alert.show(
        t("common.success"),
        t("settings.password.success"),
        [{ text: t("common.close"), onPress: () => router.push("/settings") }],
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === "invalid_current_password") {
        setCurrentError(t("settings.password.invalidCurrent"));
      } else if (message === "password_reused") {
        setNewError(t("settings.password.passwordReused"));
      } else {
        getPlatform().alert.show(t("common.error"), t("common.tryAgain"));
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-bold">
        {t("settings.password.title")}
      </h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
        className="flex flex-col gap-4"
      >
        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            {t("settings.password.current")}
          </span>
          <input
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-input border border-line p-2.5 text-sm"
          />
          {currentError && (
            <span role="alert" className="mt-1 block text-xs text-error">
              {currentError}
            </span>
          )}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            {t("settings.password.new")}
          </span>
          <input
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-input border border-line p-2.5 text-sm"
          />
          {(newPasswordError || newError) && (
            <span role="alert" className="mt-1 block text-xs text-error">
              {newPasswordError ?? newError}
            </span>
          )}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            {t("settings.password.confirm")}
          </span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-input border border-line p-2.5 text-sm"
          />
          {confirmError && (
            <span role="alert" className="mt-1 block text-xs text-error">
              {confirmError}
            </span>
          )}
        </label>

        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-card bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {t("settings.password.submit")}
        </button>
      </form>
    </div>
  );
}
