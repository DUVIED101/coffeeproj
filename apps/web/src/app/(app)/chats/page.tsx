"use client";

import React from "react";
import { useTranslation } from "react-i18next";

// Chat list + conversation surface lands in Phase 5 (realtime channels).
export default function ChatsPage(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("chats.title")}</h1>
      <p className="py-12 text-center text-ink-secondary">
        Сообщения появятся здесь в следующем обновлении.
      </p>
    </div>
  );
}
