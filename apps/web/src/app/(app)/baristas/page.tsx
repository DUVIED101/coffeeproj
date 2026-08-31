"use client";

import React from "react";
import { useTranslation } from "react-i18next";

// Business-side barista search lands in Phase 4.
export default function BaristasPage(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("nav.tabs.baristas")}</h1>
      <p className="py-12 text-center text-ink-secondary">
        Поиск бариста появится здесь в следующем обновлении.
      </p>
    </div>
  );
}
