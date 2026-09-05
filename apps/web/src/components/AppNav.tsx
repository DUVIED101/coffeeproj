"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  mdiAccountCircle,
  mdiAccountCircleOutline,
  mdiBriefcaseSearch,
  mdiBriefcaseSearchOutline,
  mdiChat,
  mdiChatOutline,
  mdiCoffee,
  mdiCoffeeOutline,
  mdiFileDocument,
  mdiFileDocumentOutline,
  mdiStorefront,
  mdiStorefrontOutline,
} from "@mdi/js";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import { useChatUnreadStore } from "@bystrobarista/core/stores/chatUnreadStore";
import { MdiIcon } from "./MdiIcon";

const TOUR_KEY_BY_HREF: Readonly<Record<string, string>> = {
  "/jobs": "tab.jobs",
  "/applications": "tab.applications",
  "/chats": "tab.chats",
  "/profile": "tab.profile",
  "/dashboard": "tab.business",
  "/baristas": "tab.baristas",
};

type NavItem = {
  href: string;
  label: string;
  icon: string;
  iconActive: string;
  badgeCount?: number;
};

function NavBadge({ count }: { count: number }): React.JSX.Element | null {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-2 -top-1 min-w-[16px] rounded-full bg-[#EF4444] px-1 text-center text-[10px] font-bold leading-4 text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

// Mirrors mobile MainTabs, including the focused/unfocused icon pairs the RN
// tab bar renders (briefcase-search, file-document, chat, account-circle for
// baristas; storefront and coffee for businesses).
const useNavItems = (): NavItem[] => {
  const { t } = useTranslation();
  const accountType = useAuthStore((s) => s.user?.accountType);
  const chatUnread = useChatUnreadStore((s) => s.unreadCount);

  if (accountType === "business") {
    return [
      {
        href: "/dashboard",
        label: t("nav.tabs.business"),
        icon: mdiStorefrontOutline,
        iconActive: mdiStorefront,
      },
      {
        href: "/baristas",
        label: t("nav.tabs.baristas"),
        icon: mdiCoffeeOutline,
        iconActive: mdiCoffee,
      },
      {
        href: "/chats",
        label: t("chats.title"),
        icon: mdiChatOutline,
        iconActive: mdiChat,
        badgeCount: chatUnread,
      },
      {
        href: "/profile",
        label: t("nav.tabs.profile"),
        icon: mdiAccountCircleOutline,
        iconActive: mdiAccountCircle,
      },
    ];
  }
  return [
    {
      href: "/jobs",
      label: t("nav.tabs.jobs"),
      icon: mdiBriefcaseSearchOutline,
      iconActive: mdiBriefcaseSearch,
    },
    {
      href: "/applications",
      label: t("nav.tabs.applications"),
      icon: mdiFileDocumentOutline,
      iconActive: mdiFileDocument,
    },
    {
      href: "/chats",
      label: t("chats.title"),
      icon: mdiChatOutline,
      iconActive: mdiChat,
      badgeCount: chatUnread,
    },
    {
      href: "/profile",
      label: t("nav.tabs.profile"),
      icon: mdiAccountCircleOutline,
      iconActive: mdiAccountCircle,
    },
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
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            data-tour={TOUR_KEY_BY_HREF[item.href]}
            className={`flex items-center gap-1.5 rounded-input px-3 py-1.5 text-sm font-medium ${
              active
                ? "bg-bg-secondary text-primary"
                : "text-ink-secondary hover:text-ink"
            }`}
          >
            <span className="relative">
              <MdiIcon path={active ? item.iconActive : item.icon} size={18} />
              <NavBadge count={item.badgeCount ?? 0} />
            </span>
            {item.label}
          </Link>
        );
      })}
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
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            data-tour={TOUR_KEY_BY_HREF[item.href]}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
              active ? "font-semibold text-primary" : "text-ink-secondary"
            }`}
          >
            <span className="relative">
              <MdiIcon path={active ? item.iconActive : item.icon} size={24} />
              <NavBadge count={item.badgeCount ?? 0} />
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
