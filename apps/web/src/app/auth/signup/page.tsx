"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AccountType } from "@bystrobarista/core/types";
import { AuthService } from "@bystrobarista/core/services/AuthService";
import { stashPendingAccountType } from "@bystrobarista/core/utils/socialAuthStash";
import { stashConsentAccepted } from "@bystrobarista/core/utils/consentStash";
import { TextField } from "@/components/ui/TextField";
import { SubmitButton } from "@/components/ui/SubmitButton";

const MIN_PASSWORD_LENGTH = 6;

// AccountTypeScreen is merged into signup as its first step (per the web
// route mapping): the user picks a role, then fills credentials.
export default function SignupPage(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedData, setAcceptedData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!accountType) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-bold">{t("auth.accountType.welcome")}</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {t("auth.accountType.subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAccountType("barista")}
          className="rounded-card border border-line p-4 text-left hover:border-primary"
        >
          <p className="font-semibold">{t("auth.accountType.baristaTitle")}</p>
          <p className="mt-1 text-sm text-ink-secondary">
            {t("auth.accountType.baristaDescription")}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setAccountType("business")}
          className="rounded-card border border-line p-4 text-left hover:border-primary"
        >
          <p className="font-semibold">{t("auth.accountType.businessTitle")}</p>
          <p className="mt-1 text-sm text-ink-secondary">
            {t("auth.accountType.businessDescription")}
          </p>
        </button>
        <p className="text-center text-sm text-ink-secondary">
          {t("auth.accountType.haveAccount")}
          <Link href="/auth/login" className="text-primary">
            {t("auth.accountType.loginLink")}
          </Link>
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError(t("auth.signup.passwordsDoNotMatch"));
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t("auth.signup.errorPasswordRules"));
      return;
    }
    if (!acceptedTerms) {
      setError(t("auth.signup.consent.errorTermsRequired"));
      return;
    }
    if (!acceptedData) {
      setError(t("auth.signup.consent.errorDataRequired"));
      return;
    }
    setSubmitting(true);
    try {
      // Same stash order as mobile SignupScreen: role + consent go into
      // platform storage BEFORE signUp so /auth/bootstrap can consume them
      // once the OTP is verified and the session lands.
      await stashPendingAccountType(accountType);
      await stashConsentAccepted();
      await AuthService.signUpWithEmail(email.trim(), password, accountType);
      router.push(
        `/auth/verify-email?email=${encodeURIComponent(email.trim())}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === "email_already_registered") {
        setError(t("auth.signup.errorEmailTaken"));
      } else if (message.toLowerCase().includes("email")) {
        setError(t("auth.signup.errorInvalidEmail"));
      } else {
        setError(t("auth.signup.errorGeneric"));
      }
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">{t("auth.signup.title")}</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          {accountType === "barista"
            ? t("auth.signup.subtitleBarista")
            : t("auth.signup.subtitleBusiness")}
        </p>
      </div>
      <TextField
        id="email"
        type="email"
        label={t("auth.signup.emailLabel")}
        placeholder={t("auth.signup.emailPlaceholder")}
        value={email}
        onChange={setEmail}
        autoComplete="email"
      />
      <TextField
        id="password"
        type="password"
        label={t("auth.signup.passwordLabel")}
        placeholder={t("auth.signup.passwordPlaceholder")}
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        hint={t("auth.signup.passwordHint")}
      />
      <TextField
        id="confirm-password"
        type="password"
        label={t("auth.signup.confirmPasswordLabel")}
        value={confirmPassword}
        onChange={setConfirmPassword}
        autoComplete="new-password"
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm text-ink-secondary">
          {t("auth.signup.consent.intro")}
        </legend>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-1"
          />
          <span>
            {t("auth.signup.consent.termsPrivacyPrefix")}
            <Link
              href="/terms"
              target="_blank"
              className="text-primary underline"
            >
              {t("auth.signup.consent.termsLink")}
            </Link>
            {t("auth.signup.consent.termsPrivacyAnd")}
            <Link
              href="/privacy"
              target="_blank"
              className="text-primary underline"
            >
              {t("auth.signup.consent.privacyLink")}
            </Link>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={acceptedData}
            onChange={(e) => setAcceptedData(e.target.checked)}
            className="mt-1"
          />
          <span>
            {t("auth.signup.consent.dataProcessingPrefix")}
            <Link
              href="/personal-data"
              target="_blank"
              className="text-primary underline"
            >
              {t("auth.signup.consent.dataProcessingLink")}
            </Link>
          </span>
        </label>
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      <SubmitButton label={t("auth.signup.cta")} loading={submitting} />
      <p className="text-center text-sm text-ink-secondary">
        {t("auth.signup.haveAccount")}
        <Link href="/auth/login" className="text-primary">
          {t("auth.signup.loginLink")}
        </Link>
      </p>
    </form>
  );
}
