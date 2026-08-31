"use client";

import Link from "next/link";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BaristaProfileService } from "@bystrobarista/core/services/BaristaProfileService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import { EQUIPMENT_CATEGORIES } from "@bystrobarista/core/config/constants";
import { isMetroAnySelection } from "@bystrobarista/core/config/metroFilter";
import type { ShiftTime } from "@bystrobarista/core/types/baristaProfile";
import { PHOTO_LIMIT } from "@bystrobarista/core/utils/storage";
import {
  pickPhotos,
  reportRejections,
} from "@bystrobarista/core/utils/pickPhotos";
import { transformedImageUrl } from "@/lib/imageTransform";
import { StarRow } from "@/components/StarRow";
import { ReviewService } from "@bystrobarista/core/services/ReviewService";
import type { UserId } from "@bystrobarista/core/types/ids";

const sectionTitle = "mb-2 text-base font-semibold";
const label =
  "mt-3 text-xs font-medium uppercase tracking-wide text-ink-secondary";

// Web port of mobile's BaristaProfileScreen (read view): avatar + portfolio
// photo management, profile summary, links to the wizard, reviews and shift
// history. Business profile management is Phase 4.
export default function ProfilePage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const isBarista = user?.accountType === "barista";
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [portfolioUploading, setPortfolioUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["baristaProfile", user?.id],
    queryFn: () => BaristaProfileService.getProfileByUserId(user?.id as string),
    enabled: Boolean(user?.id) && isBarista,
  });
  const profile = profileQuery.data;

  const aggregateQuery = useQuery({
    queryKey: ["reviews", "aggregate", user?.id],
    queryFn: () => ReviewService.getAggregateForUser(user?.id as UserId),
    enabled: Boolean(user?.id) && isBarista,
  });

  const refresh = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: ["baristaProfile"] });

  const handleAvatarUpload = async (): Promise<void> => {
    if (!user?.id) return;
    const result = await pickPhotos({ selectionLimit: 1 });
    if (!result || !reportRejections(t, result)) return;
    setAvatarUploading(true);
    setError(null);
    try {
      await BaristaProfileService.uploadAvatar(user.id, result.accepted[0].uri);
      await refresh();
    } catch {
      setError(t("baristaProfileScreen.errorAvatarUpload"));
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAddPortfolioPhotos = async (): Promise<void> => {
    if (!user?.id || !profile) return;
    const remaining = PHOTO_LIMIT - profile.portfolioPhotos.length;
    if (remaining <= 0) {
      window.alert(t("portfolioPhotos.limitReached", { max: PHOTO_LIMIT }));
      return;
    }
    const result = await pickPhotos({ selectionLimit: remaining });
    if (!result || !reportRejections(t, result)) return;
    setPortfolioUploading(true);
    setError(null);
    try {
      for (const asset of result.accepted.slice(0, remaining)) {
        await BaristaProfileService.uploadPortfolioPhoto(user.id, asset.uri);
      }
      await refresh();
    } catch {
      setError(t("photoErrors.uploadFailedBody"));
    } finally {
      setPortfolioUploading(false);
    }
  };

  const handleRemovePortfolioPhoto = async (url: string): Promise<void> => {
    if (!user?.id) return;
    if (!window.confirm(t("baristaProfileScreen.removePhotoBody"))) return;
    try {
      await BaristaProfileService.removePortfolioPhoto(user.id, url);
      await refresh();
    } catch {
      setError(t("baristaProfileScreen.errorRemovePhoto"));
    }
  };

  const equipmentGroups = profile
    ? EQUIPMENT_CATEGORIES.map((category) => ({
        key: category.key as string,
        brands: category.brands.filter((b) =>
          profile.equipmentExperience.includes(b),
        ),
      })).filter((c) => c.brands.length > 0)
    : [];
  const knownBrands = new Set<string>(
    EQUIPMENT_CATEGORIES.flatMap((c) => [...c.brands]),
  );
  const otherEquipment =
    profile?.equipmentExperience.filter((b) => !knownBrands.has(b)) ?? [];

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <h1 className="mb-4 text-2xl font-bold">
        {t("baristaProfileScreen.title")}
      </h1>

      {!isBarista && (
        <div className="rounded-card border border-line bg-white p-4">
          <p className="text-sm text-ink-secondary">{user?.email}</p>
          <p className="mt-2 text-sm text-ink-secondary">
            Управление профилем бизнеса появится в следующем обновлении.
          </p>
        </div>
      )}

      {isBarista && profileQuery.isPending && (
        <div className="h-48 animate-pulse rounded-card bg-bg-secondary" />
      )}

      {isBarista && profileQuery.isSuccess && !profile && (
        <div className="rounded-card border border-line bg-white p-6 text-center">
          <p className="font-semibold">{t("baristaProfile.noProfileTitle")}</p>
          <p className="mt-1 text-sm text-ink-secondary">
            {t("baristaProfile.noProfileSubtitle")}
          </p>
          <Link
            href="/profile/edit"
            className="mt-4 inline-block rounded-card bg-primary px-5 py-2.5 text-sm font-semibold text-white"
          >
            {t("baristaProfile.createCta")}
          </Link>
        </div>
      )}

      {isBarista && profile && (
        <>
          <div className="rounded-card border border-line bg-white p-4">
            <div className="flex items-center gap-4">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={transformedImageUrl(profile.avatarUrl, 160)}
                  alt=""
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-bg-secondary text-2xl">
                  ☕
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold">
                  {profile.firstName} {profile.lastName}
                </p>
                <p className="text-sm text-ink-secondary">{user?.email}</p>
                {aggregateQuery.data && aggregateQuery.data.reviewCount > 0 && (
                  <Link href={`/reviews/${user?.id}`} className="mt-1 block">
                    <StarRow
                      rating={aggregateQuery.data.averageRating}
                      count={aggregateQuery.data.reviewCount}
                      showValue
                    />
                  </Link>
                )}
                <p className="mt-1 text-xs text-ink-secondary">
                  {t("barista.profileCompleteness", {
                    percent: profile.profileCompleteness,
                  })}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleAvatarUpload}
                disabled={avatarUploading}
                className="rounded-input border border-line px-3 py-1.5 text-sm font-medium disabled:opacity-50"
              >
                {avatarUploading
                  ? t("baristaProfileScreen.uploading")
                  : t(
                      profile.avatarUrl
                        ? "baristaProfileScreen.changePhoto"
                        : "baristaProfileScreen.addPhoto",
                    )}
              </button>
              <Link
                href="/profile/edit"
                className="rounded-input bg-primary px-3 py-1.5 text-sm font-medium text-white"
              >
                {t("baristaProfileScreen.edit")}
              </Link>
              <Link
                href="/shifts"
                className="rounded-input border border-line px-3 py-1.5 text-sm font-medium"
              >
                {t("baristaProfileScreen.shiftHistory")}
              </Link>
            </div>
          </div>

          <div className="mt-4 rounded-card border border-line bg-white p-4">
            <h2 className={sectionTitle}>
              {t("baristaProfileScreen.portfolio")}
            </h2>
            {profile.portfolioPhotos.length === 0 ? (
              <p className="text-sm text-ink-secondary">
                {t("baristaProfileScreen.noPortfolioPhotos")}
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {profile.portfolioPhotos.map((url) => (
                  <div key={url} className="relative aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={transformedImageUrl(url, 240)}
                      alt=""
                      className="h-full w-full rounded-input object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePortfolioPhoto(url)}
                      aria-label={t("baristaProfileScreen.removePhotoA11y")}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={handleAddPortfolioPhotos}
                disabled={
                  portfolioUploading ||
                  profile.portfolioPhotos.length >= PHOTO_LIMIT
                }
                className="text-sm font-medium text-primary disabled:opacity-50"
              >
                {portfolioUploading
                  ? t("baristaProfileScreen.uploading")
                  : t("baristaProfileScreen.addPortfolioPhoto")}
              </button>
              <span className="text-xs text-ink-secondary">
                {t("portfolioPhotos.counter", {
                  count: profile.portfolioPhotos.length,
                  max: PHOTO_LIMIT,
                })}
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-card border border-line bg-white p-4">
            <h2 className={sectionTitle}>
              {t("baristaProfileScreen.personalInfo")}
            </h2>
            <p className={label}>{t("baristaProfileScreen.city")}</p>
            <p className="text-sm">{t(`city.codes.${profile.city}`)}</p>
            {profile.dateOfBirth && (
              <>
                <p className={label}>{t("baristaProfileScreen.dateOfBirth")}</p>
                <p className="text-sm">
                  {new Date(profile.dateOfBirth).toLocaleDateString(locale)}
                </p>
              </>
            )}
            {profile.medicalBookExpiresOn && (
              <>
                <p className={label}>{t("medicalBook.label")}</p>
                <p className="text-sm">
                  {t("medicalBook.status.valid", {
                    date: new Date(
                      profile.medicalBookExpiresOn,
                    ).toLocaleDateString(locale),
                  })}
                </p>
              </>
            )}
          </div>

          <div className="mt-4 rounded-card border border-line bg-white p-4">
            <h2 className={sectionTitle}>
              {t("baristaProfileScreen.professionalInfo")}
            </h2>
            {profile.bio && (
              <>
                <p className={label}>{t("baristaProfileScreen.bio")}</p>
                <p className="text-sm">{profile.bio}</p>
              </>
            )}
            {profile.yearsOfExperience != null && (
              <>
                <p className={label}>
                  {t("baristaProfileScreen.yearsExperience")}
                </p>
                <p className="text-sm">{profile.yearsOfExperience}</p>
              </>
            )}
            {(equipmentGroups.length > 0 || otherEquipment.length > 0) && (
              <>
                <p className={label}>
                  {t("baristaProfileScreen.equipmentExperience")}
                </p>
                {equipmentGroups.map((group) => (
                  <p key={group.key} className="text-sm">
                    <span className="text-ink-secondary">
                      {t(`equipmentCategories.${group.key}`)}:{" "}
                    </span>
                    {group.brands.join(", ")}
                  </p>
                ))}
                {otherEquipment.length > 0 && (
                  <p className="text-sm">
                    <span className="text-ink-secondary">
                      {t("equipmentCategories.other", {
                        defaultValue: "Другое",
                      })}
                      :{" "}
                    </span>
                    {otherEquipment.join(", ")}
                  </p>
                )}
              </>
            )}
            {profile.certifications.length > 0 && (
              <>
                <p className={label}>
                  {t("baristaProfileScreen.certifications")}
                </p>
                <p className="text-sm">{profile.certifications.join(", ")}</p>
              </>
            )}
          </div>

          <div className="mt-4 rounded-card border border-line bg-white p-4">
            <h2 className={sectionTitle}>
              {t("baristaProfileScreen.workPreferences")}
            </h2>
            {profile.preferredMetroStations.length > 0 && (
              <>
                <p className={label}>
                  {t("baristaProfileScreen.metroStations")}
                </p>
                <p className="text-sm">
                  {isMetroAnySelection(profile.preferredMetroStations)
                    ? t("metro.anyOptionTitle")
                    : profile.preferredMetroStations.join(", ")}
                </p>
              </>
            )}
            {profile.preferredShiftTimes.length > 0 && (
              <>
                <p className={label}>{t("baristaProfileScreen.shiftTimes")}</p>
                <p className="text-sm">
                  {profile.preferredShiftTimes
                    .map((s: ShiftTime) => t(`shiftTimes.${s}Range`))
                    .join(", ")}
                </p>
              </>
            )}
            {profile.hourlyRateMin != null && (
              <>
                <p className={label}>
                  {t("baristaProfileScreen.hourlyRateMin")}
                </p>
                <p className="text-sm">
                  {t("baristaProfileScreen.hourlyRateFromValue", {
                    min: profile.hourlyRateMin,
                  })}
                </p>
              </>
            )}
            {profile.availableFromDate && (
              <>
                <p className={label}>{t("baristaSetup.fieldAvailableFrom")}</p>
                <p className="text-sm">
                  {new Date(profile.availableFromDate).toLocaleDateString(
                    locale,
                  )}
                </p>
              </>
            )}
            {profile.workloadTypes.length > 0 && (
              <>
                <p className={label}>{t("baristaSetup.fieldWorkloadTypes")}</p>
                <p className="text-sm">
                  {profile.workloadTypes
                    .map((w) => t(`workloadType.${w}`))
                    .join(", ")}
                </p>
              </>
            )}
            {profile.availableDays.length > 0 && (
              <>
                <p className={label}>{t("baristaSetup.fieldAvailableDays")}</p>
                <p className="text-sm">
                  {profile.availableDays
                    .map((d) => t(`dayOfWeek.${d}`))
                    .join(", ")}
                </p>
              </>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-4 text-sm text-error">
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
