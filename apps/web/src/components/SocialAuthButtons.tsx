"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { mdiApple, mdiGoogle } from "@mdi/js";
import { supabase } from "@bystrobarista/core/config/supabase";
import { AuthService } from "@bystrobarista/core/services/AuthService";
import type { AccountType } from "@bystrobarista/core/types";
import {
  stashPendingAccountType,
  clearPendingAccountType,
} from "@bystrobarista/core/utils/socialAuthStash";
import {
  stashConsentAccepted,
  clearStashedConsent,
} from "@bystrobarista/core/utils/consentStash";
import { MdiIcon } from "@/components/MdiIcon";
import { loadAppleAuth, signInWithApplePopup } from "@/lib/appleAuth";
import { bootstrapPath } from "@/lib/authRedirect";

type Provider = "apple" | "google" | "yandex";

type Props = {
  accountType?: AccountType;
  // Signup only: both consent boxes are ticked, so bootstrap may persist
  // consent_accepted_at without its own consent gate. Login leaves it unset.
  consentAccepted?: boolean;
  disabled?: boolean;
  next?: string | null;
};

// A provider whose id is missing from the env is hidden rather than shown
// with a "not configured" alert (mobile's behaviour) — on web the config is
// deploy-time, not something the user can fix.
const APPLE_SERVICES_ID = process.env.NEXT_PUBLIC_APPLE_SERVICES_ID;
const YANDEX_CLIENT_ID = process.env.NEXT_PUBLIC_YANDEX_CLIENT_ID;
const SOCIAL_AUTH_DISABLED =
  process.env.NEXT_PUBLIC_DISABLE_SOCIAL_AUTH === "true";

function Spinner({ light }: { light: boolean }): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={`h-5 w-5 animate-spin rounded-full border-2 border-t-transparent ${
        light ? "border-white" : "border-ink"
      }`}
    />
  );
}

// Port of mobile's SocialAuthButtons. Apple runs as a popup on this page,
// Google hops through Supabase's hosted OAuth (PKCE, back via /auth/callback),
// Yandex through our own code-flow routes. All three end on /auth/bootstrap.
export function SocialAuthButtons({
  accountType,
  consentAccepted = false,
  disabled = false,
  next = null,
}: Props): React.JSX.Element | null {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Preload Apple's SDK so the click → popup hop stays inside the browser's
  // user-activation window (Safari blocks late window.open calls).
  useEffect(() => {
    if (APPLE_SERVICES_ID && !SOCIAL_AUTH_DISABLED) {
      void loadAppleAuth().catch(() => {});
    }
  }, []);

  // Consent + role stash are written or cleared BEFORE every provider hop so
  // a cancelled signup can't leak into a later login on the same browser.
  const syncStash = useCallback(async (): Promise<void> => {
    if (consentAccepted) await stashConsentAccepted();
    else await clearStashedConsent();
    if (accountType) await stashPendingAccountType(accountType);
    else await clearPendingAccountType();
  }, [accountType, consentAccepted]);

  const handleApple = async (): Promise<void> => {
    if (busy || !APPLE_SERVICES_ID) return;
    setBusy("apple");
    setError(null);
    try {
      await syncStash();
      const outcome = await signInWithApplePopup(APPLE_SERVICES_ID);
      if (outcome.status === "cancelled") return;
      if (outcome.status === "popup_blocked") {
        setError(t("auth.social.popupBlocked"));
        return;
      }
      if (outcome.status === "failed") {
        console.warn("apple sign-in failed:", outcome.reason);
        setError(t("auth.login.errorGeneric"));
        return;
      }
      await AuthService.signInWithApple(outcome.idToken, outcome.nonce);
      window.location.assign(bootstrapPath(next));
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(
        message === "email_already_registered"
          ? t("auth.social.emailAlreadyRegistered")
          : t("auth.login.errorGeneric"),
      );
    } finally {
      setBusy(null);
    }
  };

  const handleGoogle = async (): Promise<void> => {
    if (busy) return;
    setBusy("google");
    setError(null);
    try {
      await syncStash();
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("provider", "google");
      if (next) callback.searchParams.set("next", next);
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callback.toString(),
          queryParams: { prompt: "select_account" },
        },
      });
      if (oauthError) throw oauthError;
      // supabase-js has navigated the tab away; keep the spinner until then.
    } catch (err) {
      console.warn("google sign-in failed:", err);
      setError(t("auth.login.errorGeneric"));
      setBusy(null);
    }
  };

  const handleYandex = async (): Promise<void> => {
    if (busy) return;
    setBusy("yandex");
    setError(null);
    await syncStash();
    const start = new URL("/auth/yandex/start", window.location.origin);
    if (next) start.searchParams.set("next", next);
    window.location.assign(start.toString());
  };

  if (SOCIAL_AUTH_DISABLED) return null;

  const buttonBase =
    "flex h-14 w-14 items-center justify-center rounded-full transition-opacity disabled:cursor-not-allowed";
  const locked = busy !== null || disabled;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs text-ink-secondary">
          {t("auth.social.or")}
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>
      <div
        className={`flex justify-center gap-6 py-1 ${disabled ? "opacity-40" : ""}`}
      >
        {APPLE_SERVICES_ID && (
          <button
            type="button"
            onClick={() => void handleApple()}
            disabled={locked}
            aria-label={t("auth.social.appleLabel")}
            title={t("auth.social.appleLabel")}
            className={`${buttonBase} bg-black text-white`}
          >
            {busy === "apple" ? (
              <Spinner light />
            ) : (
              <MdiIcon path={mdiApple} size={28} />
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => void handleGoogle()}
          disabled={locked}
          aria-label={t("auth.social.googleLabel")}
          title={t("auth.social.googleLabel")}
          className={`${buttonBase} border border-line bg-white text-ink`}
        >
          {busy === "google" ? (
            <Spinner light={false} />
          ) : (
            <MdiIcon path={mdiGoogle} size={26} />
          )}
        </button>
        {YANDEX_CLIENT_ID && (
          <button
            type="button"
            onClick={() => void handleYandex()}
            disabled={locked}
            aria-label={t("auth.social.yandexLabel")}
            title={t("auth.social.yandexLabel")}
            className={`${buttonBase} bg-[#FC3F1D] text-2xl font-extrabold text-white`}
          >
            {busy === "yandex" ? <Spinner light /> : "Я"}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-center text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
