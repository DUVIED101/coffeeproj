"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LEGAL_DOCUMENT_VERSIONS } from "@bystrobarista/core/config/legalVersions";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  isCookieConsentCurrent,
  serializeCookieConsent,
} from "@bystrobarista/core/utils/cookieConsent";

// Consent is tied to the privacy policy edition (§10.4): a new edition asks
// again. Session cookies only appear on sign-in, so nothing is set before
// the visitor agrees.
const POLICY_VERSION = LEGAL_DOCUMENT_VERSIONS.privacy;

function hasCurrentConsent(): boolean {
  try {
    return isCookieConsentCurrent(
      window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY),
      POLICY_VERSION,
    );
  } catch {
    return true;
  }
}

function storeConsent(): void {
  try {
    window.localStorage.setItem(
      COOKIE_CONSENT_STORAGE_KEY,
      serializeCookieConsent(POLICY_VERSION, new Date()),
    );
  } catch {
    // Storage blocked: the banner simply shows again next visit.
  }
}

export function CookieConsent(): React.JSX.Element | null {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!hasCurrentConsent());
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label={t("cookies.title")}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white p-4 shadow-lg"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p>
          {t("cookies.notice")}{" "}
          <Link href="/privacy" className="text-primary underline">
            {t("cookies.more")}
          </Link>
        </p>
        <button
          type="button"
          onClick={() => {
            storeConsent();
            setVisible(false);
          }}
          className="shrink-0 rounded-lg bg-primary px-4 py-2 font-semibold text-white"
        >
          {t("cookies.accept")}
        </button>
      </div>
    </div>
  );
}
