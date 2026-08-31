"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";

type NavItem = { href: string; label: string; icon: string };

// Mirrors mobile MainTabs: barista sees Jobs/Applications, business sees
// Dashboard/Baristas; Chats and Profile are shared. Icons are emoji until the
// @mdi/js icon set lands with the fuller design pass.
const useNavItems = (): NavItem[] => {
  const { t } = useTranslation();
  const accountType = useAuthStore((s) => s.user?.accountType);

  if (accountType === "business") {
    return [
      { href: "/dashboard", label: t("nav.tabs.business"), icon: "🏪" },
      { href: "/baristas", label: t("nav.tabs.baristas"), icon: "☕" },
      { href: "/chats", label: t("chats.title"), icon: "💬" },
      { href: "/profile", label: t("nav.tabs.profile"), icon: "👤" },
    ];
  }
  return [
    { href: "/jobs", label: t("nav.tabs.jobs"), icon: "💼" },
    { href: "/applications", label: t("nav.tabs.applications"), icon: "📄" },
    { href: "/chats", label: t("chats.title"), icon: "💬" },
    { href: "/profile", label: t("nav.tabs.profile"), icon: "👤" },
  ];
};

const isActivePath = (pathname: string, href: string): boolean =>
  pathname === href || pathname.startsWith(`${href}/`);

// Desktop (md+): horizontal links inside the header row.
export function DesktopNav(): React.JSX.Element {
  const pathname = usePathname();
  const items = useNavItems();

  return (
    <nav className="hidden gap-1 md:flex" aria-label="Основная навигация">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
          className={`rounded-input px-3 py-1.5 text-sm font-medium ${
            isActivePath(pathname, item.href)
              ? "bg-bg-secondary text-primary"
              : "text-ink-secondary hover:text-ink"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

// Mobile (<md): fixed bottom tab bar, mirroring the RN bottom tabs.
export function MobileTabBar(): React.JSX.Element {
  const pathname = usePathname();
  const items = useNavItems();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Основная навигация"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
            isActivePath(pathname, item.href)
              ? "font-semibold text-primary"
              : "text-ink-secondary"
          }`}
        >
          <span aria-hidden="true" className="text-lg leading-none">
            {item.icon}
          </span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
