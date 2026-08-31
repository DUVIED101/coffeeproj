"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { WEB_APP_VERSION } from "@/platform";

export default function SupportPage(): React.JSX.Element {
  const { t } = useTranslation();
  const email = t("settings.legal.supportEmail");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">
        {t("settings.legal.supportTitle")}
      </h1>
      <p className="mb-4 text-sm text-ink-secondary">
        {t("settings.legal.supportContactHint")}
      </p>
      <a
        href={`mailto:${email}`}
        className="inline-block rounded-card bg-primary px-6 py-3 text-sm font-semibold text-white"
      >
        {email}
      </a>
      <p className="mt-8 text-xs text-ink-secondary">
        {t("settings.legal.appVersion")}: {WEB_APP_VERSION}
      </p>
    </div>
  );
}
