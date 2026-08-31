"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { BaristaProfileService } from "@bystrobarista/core/services/BaristaProfileService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";

// Read-only profile summary. The full editor (photo wizard, work experience,
// certificates) is the next Phase 3 iteration; business profile is Phase 4.
export default function ProfilePage(): React.JSX.Element {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isBarista = user?.accountType === "barista";

  const profileQuery = useQuery({
    queryKey: ["baristaProfile", user?.id],
    queryFn: () => BaristaProfileService.getProfileByUserId(user?.id as string),
    enabled: Boolean(user?.id) && isBarista,
  });

  const profile = profileQuery.data;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">{t("nav.tabs.profile")}</h1>

      <div className="rounded-card border border-line bg-white p-4">
        <p className="text-sm text-ink-secondary">{user?.email}</p>
        {isBarista && profile && (
          <>
            <p className="mt-2 text-lg font-semibold">
              {profile.firstName} {profile.lastName}
            </p>
            <p className="mt-1 text-sm text-ink-secondary">
              {t("jobFeed.profileBannerSubtitlePercent", {
                percent: profile.profileCompleteness,
              })}
            </p>
          </>
        )}
        {isBarista && profileQuery.isSuccess && !profile && (
          <p className="mt-2 text-sm text-ink-secondary">
            {t("jobFeed.profileBannerSubtitleNoProfile")}
          </p>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-ink-secondary">
        Редактирование профиля появится здесь в следующем обновлении.
      </p>
    </div>
  );
}
