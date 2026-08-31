"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { AuthService } from "@bystrobarista/core/services/AuthService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import { TextField } from "@/components/ui/TextField";
import { SubmitButton } from "@/components/ui/SubmitButton";

function LoginForm(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    if (!password) {
      setError(t("auth.login.passwordRequired"));
      return;
    }
    setSubmitting(true);
    try {
      await AuthService.signInWithEmail(email.trim(), password);
      await useAuthStore.getState().initialize();
      const next = searchParams.get("next");
      // router.push would be an SPA transition; a full navigation makes the
      // middleware re-run against the fresh session cookie.
      window.location.assign(next && next.startsWith("/") ? next : "/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("Invalid email or password")) {
        setError(t("auth.login.errorInvalidCredentials"));
      } else if (message.includes("confirm your email")) {
        setError(t("auth.login.errorEmailNotConfirmed"));
      } else {
        setError(t("auth.login.errorGeneric"));
      }
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">{t("auth.login.title")}</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          {t("auth.login.subtitle")}
        </p>
      </div>
      <TextField
        id="email"
        type="email"
        label={t("auth.login.emailLabel")}
        placeholder={t("auth.login.emailPlaceholder")}
        value={email}
        onChange={setEmail}
        autoComplete="email"
      />
      <TextField
        id="password"
        type="password"
        label={t("auth.login.passwordLabel")}
        placeholder={t("auth.login.passwordPlaceholder")}
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
      />
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      <SubmitButton label={t("auth.login.cta")} loading={submitting} />
      <div className="flex flex-col gap-2 text-center text-sm">
        <Link href="/auth/password-reset" className="text-primary">
          {t("auth.login.forgotPassword")}
        </Link>
        <p className="text-ink-secondary">
          {t("auth.login.noAccount")}{" "}
          <Link href="/auth/signup" className="text-primary">
            {t("auth.login.signupLink")}
          </Link>
        </p>
      </div>
    </form>
  );
}

export default function LoginPage(): React.JSX.Element {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
