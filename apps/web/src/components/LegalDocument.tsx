"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { getCurrentLanguage } from "@bystrobarista/core/i18n";

// Shared renderer for the four legal documents (core/legal/*): plain
// pre-wrapped text in the current language, same as mobile's screens.
export function LegalDocument({
  titleKey,
  body,
}: {
  titleKey: string;
  body: { ru: string; en: string };
}): React.JSX.Element {
  const { t } = useTranslation();
  const text = getCurrentLanguage() === "ru" ? body.ru : body.en;
  return (
    <div className="mx-auto max-w-2xl pb-10">
      <h1 className="mb-6 text-2xl font-bold">{t(titleKey)}</h1>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
    </div>
  );
}
