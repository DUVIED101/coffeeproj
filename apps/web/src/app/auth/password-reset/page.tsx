"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { AuthService } from "@bystrobarista/core/services/AuthService";
import { TextField } from "@/components/ui/TextField";
import { SubmitButton } from "@/components/ui/SubmitButton";

const OTP_LENGTH = 6;
const MIN_PASSWORD_LENGTH = 6;

// Same OTP flow as mobile PasswordResetScreen: request a 6-digit code by
// email, then exchange code + new password in one screen. No deep links.
export default function PasswordResetPage(): React.JSX.Element {
  const { t } = useTranslation();
  const [step, setStep] = useState<"request" | "confirm">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleRequest = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await AuthService.resetPassword(email.trim());
      setStep("confirm");
    } catch {
      setError(t("auth.passwordReset.errorTitle"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    if (code.trim().length !== OTP_LENGTH) {
      setError(t("auth.passwordReset.invalidCodeBody"));
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(t("auth.passwordReset.weakPasswordBody"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("auth.passwordReset.mismatchBody"));
      return;
    }
    setSubmitting(true);
    try {
      await AuthService.verifyPasswordResetOtp(email.trim(), code.trim());
      await AuthService.updatePassword(newPassword);
      window.location.assign("/");
    } catch {
      setError(t("auth.passwordReset.invalidCodeBody"));
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={step === "request" ? handleRequest : handleConfirm}
      className="flex flex-col gap-4"
    >
      <div>
        <h1 className="text-xl font-bold">{t("auth.passwordReset.title")}</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          {t("auth.passwordReset.subtitle")}
        </p>
      </div>
      <TextField
        id="email"
        type="email"
        label={t("auth.login.emailLabel")}
        value={email}
        onChange={setEmail}
        autoComplete="email"
      />
      {step === "confirm" && (
        <>
          <TextField
            id="code"
            label={t("auth.passwordReset.codeLabel")}
            placeholder={t("auth.passwordReset.codePlaceholder")}
            value={code}
            onChange={setCode}
            autoComplete="one-time-code"
          />
          <TextField
            id="new-password"
            type="password"
            label={t("auth.passwordReset.newPasswordLabel")}
            placeholder={t("auth.passwordReset.newPasswordPlaceholder")}
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
          />
          <TextField
            id="confirm-password"
            type="password"
            label={t("auth.passwordReset.confirmPasswordLabel")}
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
          />
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      <SubmitButton
        label={
          step === "request"
            ? t("auth.passwordReset.resend")
            : t("auth.passwordReset.submit")
        }
        loading={submitting}
      />
    </form>
  );
}
