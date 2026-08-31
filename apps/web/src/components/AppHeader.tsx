"use client";

import Link from "next/link";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import { STABLE_STORAGE_KEY } from "@bystrobarista/core/config/authStorage";
import { webStorage } from "@/platform/storage";

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
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-primary">
          БыстроБариста
        </Link>
        <div className="flex items-center gap-4">
          {user?.email && (
            <span className="hidden text-sm text-ink-secondary sm:inline">
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
