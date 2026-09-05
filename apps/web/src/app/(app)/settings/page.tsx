"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import { useTutorialStore } from "@bystrobarista/core/stores/tutorialStore";
import { getPlatform } from "@bystrobarista/core/platform";
import { getCurrentLanguage } from "@bystrobarista/core/i18n";
import { hasPasswordAuth } from "@bystrobarista/core/utils/authProvider";
import { STABLE_STORAGE_KEY } from "@bystrobarista/core/config/authStorage";
import { WEB_APP_VERSION } from "@/platform";
import { webStorage } from "@/platform/storage";

function Row({
  label,
  value,
  href,
  onClick,
  destructive,
}: {
  label: string;
  value?: string;
  href?: string;
  onClick?: () => void;
  destructive?: boolean;
}): React.JSX.Element {
  const body = (
    <div className="flex min-h-[44px] items-center justify-between gap-3 px-4 py-3">
      <span className={`text-sm ${destructive ? "text-error" : ""}`}>
        {label}
      </span>
      <span className="flex items-center gap-2 text-sm text-ink-secondary">
        {value}
        {(href || onClick) && <span aria-hidden="true">›</span>}
      </span>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block hover:bg-bg-secondary">
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="block w-full text-left hover:bg-bg-secondary"
      >
        {body}
      </button>
    );
  }
  return body;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary">
        {title}
      </h2>
      <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-white">
        {children}
      </div>
    </section>
  );
}

// Port of SettingsScreen: same sections, rows and ordering as mobile.
export default function SettingsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);
  const hasEmailLogin = hasPasswordAuth(session);

  const currentLang = getCurrentLanguage();
  const langLabel =
    currentLang === "ru"
      ? t("settings.language.russian")
      : t("settings.language.english");

  const handleReplayTutorial = (): void => {
    getPlatform().alert.show(
      t("tutorial.settings.confirmTitle"),
      t("tutorial.settings.confirmBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("tutorial.settings.confirm"),
          onPress: () => {
            void useTutorialStore.getState().restart();
            router.push(
              user?.accountType === "business" ? "/dashboard" : "/jobs",
            );
          },
        },
      ],
    );
  };

  const handleSignOut = async (): Promise<void> => {
    if (!window.confirm(t("settings.items.signOut"))) return;
    try {
      await useAuthStore.getState().signOut();
    } finally {
      // Same as AppHeader: signOut doesn't await the server call, so drop the
      // session cookie explicitly or middleware bounces us straight back in.
      await webStorage.removeItem(STABLE_STORAGE_KEY);
      window.location.assign("/auth/login");
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">{t("settings.title")}</h1>

      <Section title={t("settings.sections.account")}>
        <Row label={t("settings.items.email")} value={user?.email ?? "—"} />
        {hasEmailLogin && (
          <Row
            label={t("settings.items.changePassword")}
            href="/settings/password"
          />
        )}
        <Row
          label={t("settings.items.verificationStatus")}
          value={user?.isVerified ? "🟢" : "—"}
        />
      </Section>

      <Section title={t("settings.sections.preferences")}>
        <Row
          label={t("settings.items.language")}
          value={langLabel}
          href="/settings/language"
        />
        <Row
          label={t("settings.items.notifications")}
          href="/settings/notifications"
        />
        <Row
          label={t("settings.items.tutorial")}
          value={t("tutorial.settings.replay")}
          onClick={handleReplayTutorial}
        />
      </Section>

      <Section title={t("settings.sections.privacy")}>
        <Row
          label={t("settings.items.visibility")}
          href="/settings/visibility"
        />
        <Row
          label={t("settings.items.blockedUsers")}
          href="/settings/blocked-users"
        />
      </Section>

      <Section title={t("settings.sections.about")}>
        <Row label={t("settings.items.documents")} href="/settings/documents" />
        <Row label={t("settings.items.support")} href="/settings/support" />
        <Row label={t("settings.items.appVersion")} value={WEB_APP_VERSION} />
      </Section>

      <Section title={t("settings.sections.activity")}>
        <Row label={t("settings.items.myDisputes")} href="/disputes" />
      </Section>

      <Section title={t("settings.sections.dangerZone")}>
        <Row
          label={t("settings.items.signOut")}
          destructive
          onClick={() => void handleSignOut()}
        />
        <Row
          label={t("settings.items.deleteAccount")}
          destructive
          href="/settings/delete-account"
        />
      </Section>
    </div>
  );
}
