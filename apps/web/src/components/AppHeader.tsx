"use client";

import Link from "next/link";
import React from "react";
import { useTranslation } from "react-i18next";
import { mdiBell, mdiBellOutline, mdiCog, mdiCogOutline } from "@mdi/js";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import { DesktopNav } from "@/components/AppNav";
import { MdiIcon } from "@/components/MdiIcon";
import { useNotificationFeedStore } from "@/stores/notificationFeedStore";

function NotificationBell(): React.JSX.Element {
  const { t } = useTranslation();
  const pathname = usePathname();
  const unreadCount = useNotificationFeedStore((s) => s.unreadCount);
  const active = pathname.startsWith("/notifications");

  return (
    <Link
      href="/notifications"
      data-tour="header.bell"
      aria-label={t("notifications.feed.title")}
      className={`relative rounded-input p-1.5 ${
        active ? "text-primary" : "text-ink-secondary hover:text-ink"
      }`}
    >
      <MdiIcon path={active ? mdiBell : mdiBellOutline} size={22} />
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 min-w-[16px] rounded-full bg-[#EF4444] px-1 text-center text-[10px] font-bold leading-4 text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}

function SettingsGear(): React.JSX.Element {
  const { t } = useTranslation();
  const pathname = usePathname();
  const active = pathname.startsWith("/settings");

  return (
    <Link
      href="/settings"
      data-tour="header.settings"
      aria-label={t("settings.title")}
      className={`rounded-input p-1.5 ${
        active ? "text-primary" : "text-ink-secondary hover:text-ink"
      }`}
    >
      <MdiIcon path={active ? mdiCog : mdiCogOutline} size={22} />
    </Link>
  );
}

// Authed-shell header: brand, desktop nav, notification bell and settings
// gear (sign-out moved into /settings, its mobile home).
export function AppHeader(): React.JSX.Element {
  const user = useAuthStore((s) => s.user);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-primary">
          БыстроБариста
        </Link>
        <DesktopNav />
        <div className="flex items-center gap-2">
          {user?.email && (
            <span className="hidden text-sm text-ink-secondary lg:inline">
              {user.email}
            </span>
          )}
          <NotificationBell />
          <SettingsGear />
        </div>
      </div>
    </header>
  );
}
