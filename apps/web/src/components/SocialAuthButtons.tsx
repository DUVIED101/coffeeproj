"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { mdiApple, mdiGoogle } from "@mdi/js";
import { supabase } from "@bystrobarista/core/config/supabase";
import { getCurrentLanguage } from "@bystrobarista/core/i18n";
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
import {
  createGoogleNonce,
  loadGoogleIdentity,
  type GoogleNonce,
} from "@/lib/googleAuth";

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
// deploy-time, not something the user can fix. Google is the exception: the
// Supabase-hosted OAuth flow needs no client-side id, so its button always
// shows and the Identity Services path is layered on top when configured.
const APPLE_SERVICES_ID = process.env.NEXT_PUBLIC_APPLE_SERVICES_ID;
const GOOGLE_WEB_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const YANDEX_CLIENT_ID = process.env.NEXT_PUBLIC_YANDEX_CLIENT_ID;
const SOCIAL_AUTH_DISABLED =
  process.env.NEXT_PUBLIC_DISABLE_SOCIAL_AUTH === "true";

// Google's icon button renders at 40px; scaled up to match the 56px row.
const GSI_SCALE = 1.4;

type GsiState = "loading" | "ready" | "unavailable";

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

const syncStash = async (
  accountType: AccountType | undefined,
  consentAccepted: boolean,
): Promise<void> => {
  // Consent + role stash are written or cleared BEFORE every provider hop so
  // a cancelled signup can't leak into a later login on the same browser.
  if (consentAccepted) await stashConsentAccepted();
  else await clearStashedConsent();
  if (accountType) await stashPendingAccountType(accountType);
  else await clearPendingAccountType();
};

// Port of mobile's SocialAuthButtons. Apple runs as a popup on this page;
// Google mints an id_token in the browser via Identity Services (falls back
// to Supabase's hosted OAuth when the script can't load); Yandex goes
// through our own code-flow routes. All three end on /auth/bootstrap.
export function SocialAuthButtons({
  accountType,
  consentAccepted = false,
  disabled = false,
  next = null,
}: Props): React.JSX.Element | null {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gsi, setGsi] = useState<GsiState>(
    GOOGLE_WEB_CLIENT_ID ? "loading" : "unavailable",
  );
  const gsiContainer = useRef<HTMLDivElement>(null);
  const googleNonce = useRef<GoogleNonce | null>(null);
  // Google's credential callback is registered once at initialize time;
  // it reads the props through this ref so consent ticked later still counts.
  const latest = useRef({ accountType, consentAccepted, next });
  useEffect(() => {
    latest.current = { accountType, consentAccepted, next };
  });

  const failWith = useCallback(
    (err: unknown): void => {
      const message = err instanceof Error ? err.message : "";
      setError(
        message === "email_already_registered"
          ? t("auth.social.emailAlreadyRegistered")
          : t("auth.login.errorGeneric"),
      );
      setBusy(null);
    },
    [t],
  );

  const finishGoogleIdToken = useCallback(
    async (credential: string): Promise<void> => {
      setBusy("google");
      setError(null);
      try {
        const {
          accountType: role,
          consentAccepted: consent,
          next: dest,
        } = latest.current;
        await syncStash(role, consent);
        await AuthService.signInWithGoogle(
          credential,
          googleNonce.current?.raw,
        );
        window.location.assign(bootstrapPath(dest));
      } catch (err) {
        failWith(err);
      }
    },
    [failWith],
  );

  // Preload the provider SDKs so the click → popup hop stays inside the
  // browser's user-activation window (Safari blocks late window.open calls).
  useEffect(() => {
    if (SOCIAL_AUTH_DISABLED) return;
    if (APPLE_SERVICES_ID) void loadAppleAuth().catch(() => {});
    if (!GOOGLE_WEB_CLIENT_ID) return;
    let cancelled = false;
    void (async () => {
      try {
        const [api, nonce] = await Promise.all([
          loadGoogleIdentity(),
          createGoogleNonce(),
        ]);
        if (cancelled) return;
        googleNonce.current = nonce;
        api.initialize({
          client_id: GOOGLE_WEB_CLIENT_ID,
          callback: (response) => void finishGoogleIdToken(response.credential),
          nonce: nonce.hashed,
          itp_support: true,
          ux_mode: "popup",
          auto_select: false,
        });
        setGsi("ready");
      } catch (err) {
        console.warn("google identity services unavailable:", err);
        if (!cancelled) setGsi("unavailable");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [finishGoogleIdToken]);

  useEffect(() => {
    const el = gsiContainer.current;
    const api = window.google?.accounts?.id;
    if (gsi !== "ready" || !el || !api) return;
    // Strict Mode re-runs effects: start from an empty container.
    el.replaceChildren();
    api.renderButton(el, {
      type: "icon",
      shape: "circle",
      size: "large",
      theme: "outline",
      locale: getCurrentLanguage() === "ru" ? "ru" : "en",
    });
  }, [gsi]);

  const handleApple = async (): Promise<void> => {
    if (busy || !APPLE_SERVICES_ID) return;
    setBusy("apple");
    setError(null);
    try {
      await syncStash(accountType, consentAccepted);
      const outcome = await signInWithApplePopup(APPLE_SERVICES_ID);
      if (outcome.status === "cancelled") {
        setBusy(null);
        return;
      }
      if (outcome.status === "popup_blocked") {
        setError(t("auth.social.popupBlocked"));
        setBusy(null);
        return;
      }
      if (outcome.status === "failed") {
        console.warn("apple sign-in failed:", outcome.reason);
        setError(t("auth.login.errorGeneric"));
        setBusy(null);
        return;
      }
      await AuthService.signInWithApple(outcome.idToken, outcome.nonce);
      window.location.assign(bootstrapPath(next));
    } catch (err) {
      failWith(err);
    }
  };

  // Fallback when Identity Services never became ready: Supabase-hosted
  // OAuth (PKCE, returns via /auth/callback).
  const handleGoogleHosted = async (): Promise<void> => {
    if (busy) return;
    setBusy("google");
    setError(null);
    try {
      await syncStash(accountType, consentAccepted);
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
      failWith(err);
    }
  };

  const handleYandex = async (): Promise<void> => {
    if (busy) return;
    setBusy("yandex");
    setError(null);
    await syncStash(accountType, consentAccepted);
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
        {gsi === "ready" ? (
          <div
            className="relative flex h-14 w-14 items-center justify-center"
            aria-busy={busy === "google"}
          >
            <div
              ref={gsiContainer}
              style={{ transform: `scale(${GSI_SCALE})` }}
            />
            {busy === "google" && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/80">
                <Spinner light={false} />
              </div>
            )}
            {locked && busy !== "google" && (
              // Click shield: Google's rendered button can't be disabled.
              <div
                className="absolute inset-0 rounded-full"
                aria-hidden="true"
              />
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void handleGoogleHosted()}
            disabled={locked || gsi === "loading"}
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
        )}
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
