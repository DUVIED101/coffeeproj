"use client";

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BaristaProfileService } from "@bystrobarista/core/services/BaristaProfileService";
import { BusinessService } from "@bystrobarista/core/services/BusinessService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import { getPlatform } from "@bystrobarista/core/platform";

export default function VisibilitySettingsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      try {
        if (user.accountType === "barista") {
          const profile = await BaristaProfileService.getProfileByUserId(
            user.id,
          );
          if (!cancelled) setEnabled(profile?.isActivelyLooking ?? true);
        } else {
          const business = await BusinessService.getBusinessByOwnerId(user.id);
          if (!cancelled) {
            setBusinessId(business?.id ?? null);
            setEnabled(business?.isAcceptingApplications ?? true);
          }
        }
      } catch (err) {
        console.error("Error in VisibilitySettings.load:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleToggle = async (value: boolean): Promise<void> => {
    if (!user || enabled === null) return;
    const previous = enabled;
    setEnabled(value);
    try {
      if (user.accountType === "barista") {
        await BaristaProfileService.updateProfile(user.id, {
          isActivelyLooking: value,
        });
      } else {
        if (!businessId) throw new Error("No business found");
        await BusinessService.updateBusiness(businessId, {
          isAcceptingApplications: value,
        });
      }
    } catch (err) {
      console.error("Error in VisibilitySettings.toggle:", err);
      setEnabled(previous);
      getPlatform().alert.show(t("common.error"), t("common.retry"));
    }
  };

  const isBarista = user?.accountType === "barista";

  if (isLoading || enabled === null) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold">
          {t("settings.visibility.title")}
        </h1>
        <div className="h-24 animate-pulse rounded-card bg-bg-secondary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">
        {t("settings.visibility.title")}
      </h1>
      <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-card border border-line bg-white px-4 py-3">
        <span className="text-sm">
          {isBarista
            ? t("settings.visibility.baristaToggle")
            : t("settings.visibility.businessToggle")}
        </span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => void handleToggle(e.target.checked)}
          className="h-5 w-5 accent-primary"
        />
      </label>
      <p className="mt-3 px-2 text-sm text-ink-secondary">
        {isBarista
          ? t("settings.visibility.baristaHint")
          : t("settings.visibility.businessHint")}
      </p>
    </div>
  );
}
