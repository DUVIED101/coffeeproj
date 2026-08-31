"use client";

import { useSearchParams } from "next/navigation";
import React, { Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { AuthService } from "@bystrobarista/core/services/AuthService";
import { TextField } from "@/components/ui/TextField";
import { SubmitButton } from "@/components/ui/SubmitButton";

const OTP_LENGTH = 6;

function VerifyEmailForm(): React.JSX.Element {
  const { t } = useTranslation();
  const email = useSearchParams().get("email") ?? "";
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    if (code.trim().length !== OTP_LENGTH) {
      setError(t("auth.verify.invalidCodeBody", { count: OTP_LENGTH }));
      return;
    }
    setSubmitting(true);
    try {
      await AuthService.verifySignupOtp(email, code.trim());
      // Session is live now; bootstrap consumes the role/consent stashes.
      // Full navigation so the middleware sees the new session cookie.
      window.location.assign("/auth/bootstrap");
    } catch (err) {
      const message = err instanceof Error ? err.message.toLowerCase() : "";
      setError(
        message.includes("expired")
          ? t("auth.verify.expired")
          : t("auth.verify.invalidEntered"),
      );
      setSubmitting(false);
    }
  };

  const handleResend = async (): Promise<void> => {
    setResending(true);
    setError(null);
    try {
      await AuthService.resendSignupOtp(email);
      setNotice(t("auth.verify.codeResentBody"));
    } catch {
      setError(t("auth.verify.failedTitle"));
    } finally {
      setResending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">{t("auth.verify.title")}</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          {t("auth.verify.subtitle", { count: OTP_LENGTH, email })}
        </p>
      </div>
      <TextField
        id="otp"
        label={t("auth.verify.codeLabel")}
        placeholder={t("auth.verify.codePlaceholder")}
        value={code}
        onChange={setCode}
        autoComplete="one-time-code"
      />
      {notice && <p className="text-sm text-success">{notice}</p>}
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      <SubmitButton label={t("auth.verify.cta")} loading={submitting} />
      <SubmitButton
        type="button"
        variant="secondary"
        label={resending ? t("auth.verify.resending") : t("auth.verify.resend")}
        loading={resending}
        onClick={handleResend}
      />
    </form>
  );
}

export default function VerifyEmailPage(): React.JSX.Element {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
