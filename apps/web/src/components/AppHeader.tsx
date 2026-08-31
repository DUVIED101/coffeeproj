"use client";

import Link from "next/link";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { mdiBell, mdiBellOutline } from "@mdi/js";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import { STABLE_STORAGE_KEY } from "@bystrobarista/core/config/authStorage";
import { webStorage } from "@/platform/storage";
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

// Minimal authed-shell header until Phase 3 lands the full responsive
// navigation (sidebar on lg:, bottom tabs below md). Sign-out has to exist
// from day one — settings (its mobile home) only arrive in Phase 5.
export function AppHeader(): React.JSX.Element {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async (): Promise<void> => {
    setSigningOut(true);
    try {
      await useAuthStore.getState().signOut();
    } finally {
      // authStore.signOut fires supabase.auth.signOut() without awaiting it
      // (mobile's 504-tolerance pattern), so the session cookie may still be
      // present when we navigate. Drop it explicitly — otherwise the
      // middleware sees a live session and bounces us straight back in.
      await webStorage.removeItem(STABLE_STORAGE_KEY);
      window.location.assign("/auth/login");
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-primary">
          БыстроБариста
        </Link>
        <DesktopNav />
        <div className="flex items-center gap-3">
          <NotificationBell />
          {user?.email && (
            <span className="hidden text-sm text-ink-secondary lg:inline">
              {user.email}
            </span>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="rounded-input border border-line px-3 py-1.5 text-sm font-medium text-ink disabled:opacity-50"
          >
            {t("settings.items.signOut")}
          </button>
        </div>
      </div>
    </header>
  );
}
