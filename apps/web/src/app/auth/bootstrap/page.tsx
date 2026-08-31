"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@bystrobarista/core/config/supabase";
import type { AccountType } from "@bystrobarista/core/types";
import type { UserId } from "@bystrobarista/core/types/ids";
import {
  recordCurrentLegalAcceptances,
  getOutstandingLegalAcceptances,
} from "@bystrobarista/core/services/LegalAcceptanceService";
import {
  readPendingAccountType,
  clearPendingAccountType,
} from "@bystrobarista/core/utils/socialAuthStash";
import { consumeStashedConsent } from "@bystrobarista/core/utils/consentStash";
import { SubmitButton } from "@/components/ui/SubmitButton";

type Phase =
  | { name: "working" }
  | { name: "consent"; userId: UserId }
  | { name: "error"; message: string };

// Compact port of mobile's ProfileBootstrapScreen: ensure the public.users
// row exists with the intended role, honour the signup-time consent stash,
// and gate on outstanding legal-document versions. Full wizard-mode profile
// setup arrives with Phase 3's /profile/edit.
export default function BootstrapPage(): React.JSX.Element {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>({ name: "working" });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedData, setAcceptedData] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  const attempt = useCallback(async (): Promise<void> => {
    setPhase({ name: "working" });
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        window.location.assign("/auth/login");
        return;
      }

      const meta = (session.user.user_metadata ?? {}) as {
        account_type?: string;
      };
      const pendingAccountType = await readPendingAccountType();
      const stashedConsent = await consumeStashedConsent();
      const desiredAccountType: AccountType =
        meta.account_type === "business" || meta.account_type === "barista"
          ? meta.account_type
          : (pendingAccountType ?? "barista");

      const { data: existing, error: existingErr } = await supabase
        .from("users")
        .select(
          "account_type, account_type_set_explicitly, consent_accepted_at",
        )
        .eq("id", session.user.id)
        .maybeSingle();
      if (existingErr) throw new Error(existingErr.message);

      if (existing) {
        const stored = existing.account_type as AccountType | null;
        const lockedExplicitly = existing.account_type_set_explicitly === true;

        if (lockedExplicitly) {
          if (stored && pendingAccountType && stored !== pendingAccountType) {
            await clearPendingAccountType();
            await supabase.auth.signOut();
            throw new Error("email_already_registered_different_role");
          }
          if (stashedConsent && existing.consent_accepted_at == null) {
            const { error: updErr } = await supabase
              .from("users")
              .update({ consent_accepted_at: new Date().toISOString() })
              .eq("id", session.user.id);
            if (updErr) throw new Error(updErr.message);
          }
        } else {
          const finalRole: AccountType =
            pendingAccountType ?? stored ?? desiredAccountType;
          const update: Record<string, unknown> = {
            account_type: finalRole,
            account_type_set_explicitly: true,
          };
          if (stashedConsent && !existing.consent_accepted_at) {
            update.consent_accepted_at = new Date().toISOString();
          }
          const { error: updateError } = await supabase
            .from("users")
            .update(update)
            .eq("id", session.user.id);
          if (updateError) throw new Error(updateError.message);
        }
      } else {
        const insertPayload: Record<string, unknown> = {
          id: session.user.id,
          email: session.user.email ?? "",
          account_type: desiredAccountType,
          account_type_set_explicitly: true,
        };
        if (stashedConsent) {
          insertPayload.consent_accepted_at = new Date().toISOString();
        }
        const { error: insertError } = await supabase
          .from("users")
          .insert(insertPayload);
        if (insertError) throw new Error(insertError.message);
      }
      await clearPendingAccountType();

      const userId = session.user.id as UserId;

      if (stashedConsent) {
        try {
          await recordCurrentLegalAcceptances(userId);
        } catch (logErr) {
          console.warn(
            "recordCurrentLegalAcceptances failed during bootstrap:",
            logErr,
          );
        }
      }

      const { data: refreshed } = await supabase
        .from("users")
        .select("consent_accepted_at")
        .eq("id", userId)
        .single();

      let outstanding: string[] = [];
      try {
        outstanding = await getOutstandingLegalAcceptances(userId);
      } catch (outstandingErr) {
        console.warn("getOutstandingLegalAcceptances failed:", outstandingErr);
      }

      if (!refreshed?.consent_accepted_at || outstanding.length > 0) {
        setPhase({ name: "consent", userId });
        return;
      }

      // Full navigation: the middleware profile cache (bb_profile, 5 min TTL)
      // must be re-derived now that consent/account_type changed.
      window.location.assign("/");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setPhase({
        name: "error",
        message:
          message === "email_already_registered_different_role"
            ? t("auth.profileBootstrap.differentRole")
            : message,
      });
    }
  }, [t]);

  useEffect(() => {
    void attempt();
  }, [attempt]);

  const handleAcceptConsent = async (): Promise<void> => {
    if (phase.name !== "consent") return;
    if (!acceptedTerms || !acceptedData) {
      setConsentError(t("auth.signup.consent.errorTermsRequired"));
      return;
    }
    setAccepting(true);
    setConsentError(null);
    try {
      const { error: updErr } = await supabase
        .from("users")
        .update({ consent_accepted_at: new Date().toISOString() })
        .eq("id", phase.userId);
      if (updErr) throw new Error(updErr.message);
      await recordCurrentLegalAcceptances(phase.userId);
      window.location.assign("/");
    } catch (e) {
      setConsentError(e instanceof Error ? e.message : "Unknown error");
      setAccepting(false);
    }
  };

  const handleSignOut = async (): Promise<void> => {
    await supabase.auth.signOut();
    window.location.assign("/auth/login");
  };

  if (phase.name === "working") {
    return (
      <p className="text-center text-sm text-ink-secondary" aria-busy="true">
        {t("auth.profileBootstrap.working")}
      </p>
    );
  }

  if (phase.name === "error") {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-bold">
          {t("auth.profileBootstrap.failedTitle")}
        </h1>
        <p role="alert" className="text-sm text-error">
          {phase.message}
        </p>
        <SubmitButton
          type="button"
          label={t("auth.profileBootstrap.retry")}
          onClick={attempt}
        />
        <SubmitButton
          type="button"
          variant="secondary"
          label={t("auth.profileBootstrap.signOut")}
          onClick={handleSignOut}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">
          {t("auth.profileBootstrap.consentTitle")}
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          {t("auth.profileBootstrap.consentBody")}
        </p>
      </div>
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
      {consentError && (
        <p role="alert" className="text-sm text-error">
          {consentError}
        </p>
      )}
      <SubmitButton
        type="button"
        label={t("auth.profileBootstrap.consentAccept")}
        loading={accepting}
        onClick={handleAcceptConsent}
      />
      <SubmitButton
        type="button"
        variant="secondary"
        label={t("auth.profileBootstrap.signOut")}
        onClick={handleSignOut}
      />
    </div>
  );
}
