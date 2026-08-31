"use client";

import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useBlockedUsersStore } from "@bystrobarista/core/stores/blockedUsersStore";

export default function BlockedUsersPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
  const blocked = useBlockedUsersStore((s) => s.blocked);
  const hydrate = useBlockedUsersStore((s) => s.hydrate);
  const unblock = useBlockedUsersStore((s) => s.unblock);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const handleUnblock = (userId: string, displayName: string): void => {
    const name = displayName || t("settings.blockedUsers.unknownUser");
    if (
      window.confirm(
        `${t("settings.blockedUsers.unblockTitle")}\n${t("settings.blockedUsers.unblockBody", { name })}`,
      )
    ) {
      void unblock(userId);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">
        {t("settings.blockedUsers.title")}
      </h1>

      {blocked.length === 0 ? (
        <div className="py-16 text-center">
          <p className="mb-2 text-lg font-semibold text-ink-secondary">
            {t("settings.blockedUsers.emptyTitle")}
          </p>
          <p className="text-sm text-ink-secondary">
            {t("settings.blockedUsers.emptyBody")}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-white">
          {blocked.map((entry) => (
            <div
              key={entry.userId}
              className="flex min-h-[44px] items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {entry.displayName || t("settings.blockedUsers.unknownUser")}
                </p>
                <p className="text-xs text-ink-secondary">
                  {new Date(entry.blockedAt).toLocaleDateString(locale)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleUnblock(entry.userId, entry.displayName)}
                className="shrink-0 rounded-input border border-line px-3 py-1.5 text-sm font-medium text-error"
              >
                {t("settings.blockedUsers.unblockCta")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
