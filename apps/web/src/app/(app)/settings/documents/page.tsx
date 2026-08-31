"use client";

import Link from "next/link";
import React from "react";
import { useTranslation } from "react-i18next";

const YANDEX_MAPS_TERMS_URL = "https://yandex.ru/legal/maps_api/";

// Port of DocumentsScreen: hub for the four legal documents + Yandex Maps
// API terms (external).
export default function DocumentsPage(): React.JSX.Element {
  const { t } = useTranslation();

  const items = [
    { label: t("settings.items.terms"), href: "/settings/terms" },
    { label: t("settings.items.privacyPolicy"), href: "/settings/privacy" },
    {
      label: t("settings.items.personalDataPolicy"),
      href: "/settings/personal-data",
    },
    { label: t("settings.items.dataConsent"), href: "/settings/data-consent" },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">
        {t("settings.items.documents")}
      </h1>
      <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-white">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-[44px] items-center justify-between px-4 py-3 text-sm hover:bg-bg-secondary"
          >
            {item.label}
            <span aria-hidden="true" className="text-ink-secondary">
              ›
            </span>
          </Link>
        ))}
        <a
          href={YANDEX_MAPS_TERMS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[44px] items-center justify-between px-4 py-3 text-sm hover:bg-bg-secondary"
        >
          {t("settings.items.yandexMapsTerms")}
          <span aria-hidden="true" className="text-ink-secondary">
            ↗
          </span>
        </a>
      </div>
    </div>
  );
}
