"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  changeLanguage,
  getCurrentLanguage,
  type SupportedLanguage,
} from "@bystrobarista/core/i18n";
import { supabase } from "@bystrobarista/core/config/supabase";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";

const OPTIONS: ReadonlyArray<{
  value: SupportedLanguage;
  labelKey: string;
}> = [
  { value: "ru", labelKey: "settings.language.russian" },
  { value: "en", labelKey: "settings.language.english" },
];

export default function LanguageSettingsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const [selected, setSelected] =
    useState<SupportedLanguage>(getCurrentLanguage());
  const [isChanging, setIsChanging] = useState(false);

  const handleSelect = async (lang: SupportedLanguage): Promise<void> => {
    if (isChanging) return;
    setSelected(lang);
    setIsChanging(true);
    try {
      await changeLanguage(lang);
      const userId = useAuthStore.getState().user?.id;
      if (userId) {
        // Best-effort DB sync — server-rendered notifications read
        // users.language. Client i18n works either way (bb_lang cookie).
        const { error } = await supabase
          .from("users")
          .update({ language: lang })
          .eq("id", userId);
        if (error) {
          console.warn("Could not persist users.language:", error.message);
        }
      }
      router.push("/settings");
    } catch (err) {
      console.error("Error in changeLanguage:", err);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">
        {t("settings.language.title")}
      </h1>
      <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-white">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={isChanging}
            onClick={() => void handleSelect(option.value)}
            className="flex min-h-[44px] w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-bg-secondary disabled:opacity-60"
          >
            {t(option.labelKey)}
            {option.value === selected && (
              <span className="font-semibold text-primary">✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
