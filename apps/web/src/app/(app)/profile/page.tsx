"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MdiIcon } from "@/components/MdiIcon";
import { mdiCameraOutline, mdiPencilOutline } from "@mdi/js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPlatform } from "@bystrobarista/core/platform";
import { BaristaProfileService } from "@bystrobarista/core/services/BaristaProfileService";
import { ReviewService } from "@bystrobarista/core/services/ReviewService";
import { WorkExperienceService } from "@bystrobarista/core/services/WorkExperienceService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import { EQUIPMENT_CATEGORIES } from "@bystrobarista/core/config/constants";
import {
  METRO_ANY,
  isMetroAnySelection,
} from "@bystrobarista/core/config/metroFilter";
import {
  DAYS_OF_WEEK,
  WORKLOAD_TYPES,
  type BaristaProfile,
  type DayOfWeek,
  type ShiftTime,
  type WorkloadType,
} from "@bystrobarista/core/types/baristaProfile";
import { toCityCode, type CityCode } from "@bystrobarista/core/types/city";
import type { GeoPoint } from "@bystrobarista/core/types/business";
import type { BaristaProfileId, UserId } from "@bystrobarista/core/types/ids";
import {
  findDraftErrors,
  type WorkExperience,
  type WorkExperienceDraft,
  type WorkExperienceFieldError,
} from "@bystrobarista/core/types/workExperience";
import { yearsBetween } from "@bystrobarista/core/utils/age";
import { dobMaxDate, dobMinDate } from "@bystrobarista/core/utils/dateRanges";
import {
  getCurrentLocation,
  requestLocationPermission,
} from "@bystrobarista/core/utils/geolocation";
import { computeMedicalBookStatus } from "@bystrobarista/core/utils/medicalBook";
import {
  pickPhotos,
  reportRejections,
} from "@bystrobarista/core/utils/pickPhotos";
import {
  computeProfileCompleteness,
  type CompletenessItemKey,
} from "@bystrobarista/core/utils/profileCompleteness";
import { PHOTO_LIMIT } from "@bystrobarista/core/utils/storage";
import {
  SHORT_TEXT_MAX_LENGTH,
  sanitizeDigitsInput,
  sanitizeNameInput,
  sanitizeYearsInput,
} from "@bystrobarista/core/utils/validation";
import { BusinessProfileView } from "@/components/BusinessProfileView";
import { ImageLightbox } from "@/components/ImageLightbox";
import { MetroFilterModal } from "@/components/MetroFilterModal";
import { StarRow } from "@/components/StarRow";
import { WorkExperienceEditor } from "@/components/WorkExperienceEditor";
import { WorkExperienceList } from "@/components/WorkExperienceList";
import { formatDateOnly } from "@/lib/dates";
import { transformedImageUrl } from "@/lib/imageTransform";

const SHIFT_TIMES: ShiftTime[] = ["morning", "afternoon", "evening", "night"];
const BIO_MAX = 500;
const RATE_MAX_DIGITS = 6;
const CITIES: CityCode[] = ["spb", "moscow"];

const sectionTitle = "mb-2 text-base font-semibold";
const label =
  "mt-3 text-xs font-medium uppercase tracking-wide text-ink-secondary";
const fieldLabel = "mt-3 block text-sm font-medium text-ink";
const input =
  "mt-1 w-full rounded-input border border-line px-3 py-2 text-sm outline-none focus:border-primary";
const chip = (active: boolean): string =>
  `rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
    active
      ? "border-primary bg-primary text-white"
      : "border-line bg-white text-ink"
  }`;

const toIso = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const completenessBar = (percent: number): string =>
  percent < 50 ? "bg-error" : percent < 80 ? "bg-warning" : "bg-success";

const medicalBadge: Record<string, string> = {
  valid: "bg-success/15 text-success",
  expiringSoon: "bg-warning/15 text-warning",
  expired: "bg-error/15 text-error",
  none: "bg-bg-secondary text-ink-secondary",
};

// Edit-mode form. One object instead of twenty useStates so Cancel is a
// single reset and Save reads one value.
type Form = {
  firstName: string;
  lastName: string;
  city: CityCode;
  dateOfBirth: string;
  bio: string;
  yearsOfExperience: string;
  equipment: string[];
  medicalBookExpiresOn: string;
  metroStations: string[];
  shiftTimes: ShiftTime[];
  hourlyRateMin: string;
  availableFromDate: string;
  availableDays: DayOfWeek[];
  workloadTypes: WorkloadType[];
  isActivelyLooking: boolean;
  workExperiences: WorkExperienceDraft[];
};

const formFromProfile = (
  profile: BaristaProfile,
  experiences: WorkExperience[],
): Form => ({
  firstName: profile.firstName,
  lastName: profile.lastName,
  city: toCityCode(profile.city),
  dateOfBirth: profile.dateOfBirth ?? "",
  bio: profile.bio ?? "",
  yearsOfExperience:
    profile.yearsOfExperience != null ? String(profile.yearsOfExperience) : "",
  equipment: profile.equipmentExperience,
  medicalBookExpiresOn: profile.medicalBookExpiresOn ?? "",
  metroStations: profile.preferredMetroStations,
  shiftTimes: profile.preferredShiftTimes,
  hourlyRateMin:
    profile.hourlyRateMin != null ? String(profile.hourlyRateMin) : "",
  availableFromDate: profile.availableFromDate ?? "",
  availableDays: profile.availableDays ?? [],
  workloadTypes: profile.workloadTypes ?? [],
  isActivelyLooking: profile.isActivelyLooking,
  workExperiences: experiences.map((e) => ({
    id: e.id,
    employer: e.employer,
    position: e.position,
    startYear: e.startYear,
    startMonth: e.startMonth,
    endYear: e.endYear,
    endMonth: e.endMonth,
    isCurrent: e.isCurrent,
    description: e.description,
  })),
});

const toggleIn = <T,>(list: T[], value: T): T[] =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

// Web port of mobile's BaristaProfileScreen: the read view doubles as the
// editor. The pencil flips every section into inline inputs; Save issues one
// updateProfile + WorkExperienceService.replaceAll, Cancel discards the form.
// The /profile/edit wizard is only for first-time creation now.
export default function ProfilePage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const isBarista = user?.accountType === "barista";

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [workExperienceErrors, setWorkExperienceErrors] = useState<
    ReadonlyArray<ReadonlyArray<WorkExperienceFieldError>>
  >([]);
  const [isSaving, setIsSaving] = useState(false);
  const [certDraft, setCertDraft] = useState("");
  const [metroOpen, setMetroOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<GeoPoint | undefined>(
    undefined,
  );
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [portfolioUploading, setPortfolioUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{
    photos: string[];
    index: number;
  } | null>(null);

  const profileQuery = useQuery({
    queryKey: ["baristaProfile", user?.id],
    queryFn: () => BaristaProfileService.getProfileByUserId(user?.id as string),
    enabled: Boolean(user?.id) && isBarista,
  });
  const profile = profileQuery.data;

  const experiencesQuery = useQuery({
    queryKey: ["workExperiences", profile?.id],
    queryFn: () =>
      WorkExperienceService.listForProfile(profile?.id as BaristaProfileId),
    enabled: Boolean(profile?.id),
  });
  const workExperiences = experiencesQuery.data ?? [];

  const aggregateQuery = useQuery({
    queryKey: ["reviews", "aggregate", user?.id],
    queryFn: () => ReviewService.getAggregateForUser(user?.id as UserId),
    enabled: Boolean(user?.id) && isBarista,
  });

  const reliabilityQuery = useQuery({
    queryKey: ["baristaReliability", user?.id],
    queryFn: () =>
      BaristaProfileService.getReliabilityScore(user?.id as UserId).catch(
        () => null,
      ),
    enabled: Boolean(user?.id) && isBarista,
  });

  useEffect(() => {
    if (!isEditing) return;
    let cancelled = false;
    const locate = async (): Promise<void> => {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission || cancelled) return;
      const location = await getCurrentLocation();
      if (location && !cancelled) setUserLocation(location);
    };
    void locate();
    return () => {
      cancelled = true;
    };
  }, [isEditing]);

  const patch = (next: Partial<Form>): void =>
    setForm((prev) => (prev ? { ...prev, ...next } : prev));

  const refreshProfile = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: ["baristaProfile"] });

  const handleEdit = (): void => {
    if (!profile) return;
    setForm(formFromProfile(profile, workExperiences));
    setWorkExperienceErrors([]);
    setError(null);
    setIsEditing(true);
  };

  const handleCancel = (): void => {
    setIsEditing(false);
    setForm(null);
    setWorkExperienceErrors([]);
    setError(null);
  };

  const handleSave = async (): Promise<void> => {
    if (!user?.id || !profile || !form) return;
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError(t("baristaSetup.validationRequired"));
      return;
    }
    const draftErrors = form.workExperiences.map(findDraftErrors);
    if (draftErrors.some((e) => e.length > 0)) {
      setWorkExperienceErrors(draftErrors);
      setError(t("barista.workExperience.errors.fillRequired"));
      return;
    }
    setWorkExperienceErrors([]);
    setIsSaving(true);
    setError(null);
    try {
      const updated = await BaristaProfileService.updateProfile(user.id, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        city: form.city,
        dateOfBirth: form.dateOfBirth || undefined,
        bio: form.bio.trim() || undefined,
        yearsOfExperience: form.yearsOfExperience
          ? parseFloat(form.yearsOfExperience)
          : undefined,
        equipmentExperience: form.equipment,
        certifications: profile.certifications,
        preferredMetroStations: form.metroStations,
        preferredShiftTimes: form.shiftTimes,
        hourlyRateMin: form.hourlyRateMin
          ? parseInt(form.hourlyRateMin, 10)
          : undefined,
        medicalBookExpiresOn: form.medicalBookExpiresOn || undefined,
        availableFromDate: form.availableFromDate || undefined,
        availableDays: form.availableDays,
        workloadTypes: form.workloadTypes,
        isActivelyLooking: form.isActivelyLooking,
      });
      await WorkExperienceService.replaceAll(
        updated.id as BaristaProfileId,
        form.workExperiences,
      );
      await Promise.all([
        refreshProfile(),
        queryClient.invalidateQueries({ queryKey: ["workExperiences"] }),
      ]);
      setIsEditing(false);
      setForm(null);
      getPlatform().alert.show(
        t("baristaProfileScreen.successTitle"),
        t("baristaProfileScreen.successProfile"),
        [{ text: t("common.ok") }],
      );
    } catch (e) {
      console.error("Error updating profile:", e);
      setError(t("baristaProfileScreen.errorUpdate"));
    } finally {
      setIsSaving(false);
    }
  };

  // Certificates persist immediately (mobile parity): the list lives on the
  // profile row, not in the edit form.
  const persistCertifications = async (next: string[]): Promise<void> => {
    if (!user?.id) return;
    try {
      await BaristaProfileService.setCertifications(user.id, next);
      await refreshProfile();
    } catch {
      setError(t("baristaProfileScreen.errorSaveCert"));
    }
  };

  const addCertificate = (): void => {
    if (!profile) return;
    const name = certDraft.trim().slice(0, SHORT_TEXT_MAX_LENGTH);
    if (!name) return;
    if (profile.certifications.includes(name)) {
      window.alert(t("certificatesEditor.duplicateBody", { name }));
      return;
    }
    setCertDraft("");
    void persistCertifications([...profile.certifications, name]);
  };

  const removeCertificate = (name: string): void => {
    if (!profile) return;
    if (!window.confirm(t("certificatesEditor.removeBody", { name }))) return;
    void persistCertifications(
      profile.certifications.filter((c) => c !== name),
    );
  };

  const handleAvatarUpload = async (): Promise<void> => {
    if (!user?.id) return;
    const result = await pickPhotos({ selectionLimit: 1 });
    if (!result || !reportRejections(t, result)) return;
    setAvatarUploading(true);
    setError(null);
    try {
      await BaristaProfileService.uploadAvatar(user.id, result.accepted[0].uri);
      await refreshProfile();
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
      await refreshProfile();
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
      await refreshProfile();
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

  const completeness = profile
    ? computeProfileCompleteness({ ...profile, workExperiences })
    : null;
  const missingItems =
    completeness?.items.filter((item) => !item.satisfied) ?? [];
  const age = yearsBetween(profile?.dateOfBirth);
  const medicalStatus = computeMedicalBookStatus(profile?.medicalBookExpiresOn);
  const aggregate = aggregateQuery.data;
  const reliability = reliabilityQuery.data;

  const metroCount = (form?.metroStations ?? []).filter(
    (s) => s !== METRO_ANY,
  ).length;
  const metroLabel = form?.metroStations.includes(METRO_ANY)
    ? t("metro.anyOptionTitle")
    : metroCount > 0
      ? t("metro.selectedCount", { count: metroCount })
      : t("metro.titleMulti");

  const editing = isEditing && form !== null;

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <h1 className="mb-4 text-2xl font-bold">
        {t(isBarista ? "baristaProfileScreen.title" : "businessProfile.title")}
      </h1>

      {!isBarista && <BusinessProfileView />}

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
            data-tour="profile.createCta"
            className="mt-4 inline-block rounded-card bg-primary px-5 py-2.5 text-sm font-semibold text-white"
          >
            {t("baristaProfile.createCta")}
          </Link>
        </div>
      )}

      {isBarista && profile && completeness && (
        <>
          <div className="rounded-card border border-line bg-white p-4">
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center gap-2">
                {profile.avatarUrl ? (
                  <button
                    type="button"
                    onClick={() =>
                      setLightbox({
                        photos: [profile.avatarUrl as string],
                        index: 0,
                      })
                    }
                    aria-label={t("baristaProfileScreen.viewAvatarA11y")}
                    className="rounded-full"
                  >
                    <img
                      src={transformedImageUrl(profile.avatarUrl, 160)}
                      alt=""
                      className="h-20 w-20 rounded-full object-cover"
                    />
                  </button>
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white">
                    {profile.firstName[0]}
                    {profile.lastName[0]}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleAvatarUpload}
                  disabled={avatarUploading}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary disabled:opacity-50"
                >
                  <MdiIcon path={mdiCameraOutline} size={14} />
                  {avatarUploading
                    ? t("baristaProfileScreen.uploading")
                    : t(
                        profile.avatarUrl
                          ? "baristaProfileScreen.changePhotoLong"
                          : "baristaProfileScreen.addPhoto",
                      )}
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-lg font-semibold">
                    {profile.firstName} {profile.lastName}
                  </p>
                  {!editing && (
                    <button
                      type="button"
                      onClick={handleEdit}
                      aria-label={t("baristaProfileScreen.edit")}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-input border border-line px-3 py-1.5 text-sm font-medium text-primary hover:bg-bg-secondary"
                    >
                      <MdiIcon path={mdiPencilOutline} size={16} />
                      <span className="hidden sm:inline">
                        {t("baristaProfileScreen.editProfileLong")}
                      </span>
                      <span className="sm:hidden">
                        {t("baristaProfileScreen.edit")}
                      </span>
                    </button>
                  )}
                </div>
                <p className="text-sm text-ink-secondary">
                  {t(`city.codes.${toCityCode(profile.city)}`)}
                  {age !== null &&
                    ` · ${t("baristaProfileScreen.yearsOld", { count: age })}`}
                </p>
                <p className="text-sm text-ink-secondary">{user?.email}</p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-secondary">
                  <div
                    className={`h-full ${completenessBar(completeness.percent)}`}
                    style={{ width: `${completeness.percent}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-ink-secondary">
                  {t("barista.profileCompleteness", {
                    percent: completeness.percent,
                  })}
                </p>
                {missingItems.length > 0 && (
                  <div className="mt-2 text-xs text-ink-secondary">
                    <p className="font-medium">
                      {t("barista.completeness.missingTitle")}:
                    </p>
                    <ul className="mt-0.5 list-inside list-disc">
                      {missingItems.map((item) => (
                        <li key={item.key}>
                          {t(
                            `barista.completeness.items.${item.key as CompletenessItemKey}`,
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-card border border-line bg-white p-4">
            {editing && (
              <div className="mb-3 flex items-center justify-between border-b border-line pb-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="text-sm font-medium text-ink-secondary"
                >
                  {t("baristaProfileScreen.cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={isSaving}
                  className="rounded-input bg-primary px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {isSaving
                    ? t("baristaProfileScreen.saving")
                    : t("baristaProfileScreen.save")}
                </button>
              </div>
            )}
            <h2 className={sectionTitle}>
              {t("baristaProfileScreen.personalInfo")}
            </h2>
            {editing ? (
              <>
                <label className={fieldLabel}>
                  {t("baristaProfileScreen.firstName")}
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) =>
                      patch({ firstName: sanitizeNameInput(e.target.value) })
                    }
                    className={input}
                  />
                </label>
                <label className={fieldLabel}>
                  {t("baristaProfileScreen.lastName")}
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) =>
                      patch({ lastName: sanitizeNameInput(e.target.value) })
                    }
                    className={input}
                  />
                </label>
                <span className={fieldLabel}>
                  {t("baristaProfileScreen.city")}
                </span>
                <div className="mt-1 flex gap-2">
                  {CITIES.map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        if (code === form.city) return;
                        patch({ city: code, metroStations: [] });
                      }}
                      className={chip(form.city === code)}
                    >
                      {t(`city.codes.${code}`)}
                    </button>
                  ))}
                </div>
                <label className={fieldLabel}>
                  {t("baristaProfileScreen.dateOfBirth")}
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    min={toIso(dobMinDate())}
                    max={toIso(dobMaxDate())}
                    onChange={(e) => patch({ dateOfBirth: e.target.value })}
                    className={input}
                  />
                </label>
              </>
            ) : (
              <div className="divide-y divide-line">
                <Link
                  href="/shifts"
                  className="flex items-center justify-between py-2.5 text-sm hover:text-primary"
                >
                  {t("baristaProfileScreen.shiftHistory")}
                  <span aria-hidden="true">›</span>
                </Link>
                <Link
                  href={`/reviews/${user?.id}`}
                  className="flex items-center justify-between py-2.5 text-sm hover:text-primary"
                >
                  <span>
                    {t("baristaProfileScreen.allReviews")}
                    <span className="mt-0.5 block text-xs text-ink-secondary">
                      {aggregate && aggregate.reviewCount > 0 ? (
                        <StarRow
                          rating={aggregate.averageRating}
                          count={aggregate.reviewCount}
                          showValue
                        />
                      ) : (
                        t("reviews.noRatingsShort")
                      )}
                    </span>
                  </span>
                  <span aria-hidden="true">›</span>
                </Link>
                <Link
                  href="/disputes"
                  className="flex items-center justify-between py-2.5 text-sm hover:text-primary"
                >
                  <span>
                    {t("reliability.sectionTitle")}
                    {reliability && (
                      <span className="mt-0.5 block text-xs text-ink-secondary">
                        {t("reliability.scoreOf", {
                          score: reliability.reliabilityScore.toFixed(1),
                        })}
                        {reliability.incidents30d > 0
                          ? ` · ${t("reliability.incidents", { count: reliability.incidents30d })}`
                          : ` · ${t("reliability.noIncidents")}`}
                      </span>
                    )}
                  </span>
                  <span aria-hidden="true">›</span>
                </Link>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-card border border-line bg-white p-4">
            <h2 className={sectionTitle}>
              {t("baristaProfileScreen.professionalInfo")}
            </h2>
            {editing ? (
              <>
                <label className={fieldLabel}>
                  {t("baristaProfileScreen.bio")}
                  <textarea
                    rows={4}
                    value={form.bio}
                    onChange={(e) =>
                      patch({ bio: e.target.value.slice(0, BIO_MAX) })
                    }
                    className={input}
                  />
                  <span className="block text-right text-xs font-normal text-ink-secondary">
                    {t("baristaSetup.fieldBioCounter", {
                      count: form.bio.length,
                    })}
                  </span>
                </label>
                <label className={fieldLabel}>
                  {t("baristaProfileScreen.yearsExperience")}
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.yearsOfExperience}
                    onChange={(e) =>
                      patch({
                        yearsOfExperience: sanitizeYearsInput(e.target.value),
                      })
                    }
                    className={input}
                  />
                </label>
                <span className={fieldLabel}>
                  {t("baristaProfileScreen.equipmentExperience")}
                </span>
                {EQUIPMENT_CATEGORIES.map((category) => (
                  <div key={category.key} className="mt-2">
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-secondary">
                      {t(`equipmentCategories.${category.key}`)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {category.brands.map((brand) => (
                        <button
                          key={brand}
                          type="button"
                          onClick={() =>
                            patch({
                              equipment: toggleIn(form.equipment, brand),
                            })
                          }
                          className={chip(form.equipment.includes(brand))}
                        >
                          {brand}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <span className={fieldLabel}>
                  {t("baristaProfileScreen.certifications")}
                </span>
                <div className="mt-1 flex flex-col gap-2">
                  {profile.certifications.map((name) => (
                    <div
                      key={name}
                      className="flex items-center justify-between rounded-input border border-line px-3 py-2"
                    >
                      <span className="text-sm">{name}</span>
                      <button
                        type="button"
                        onClick={() => removeCertificate(name)}
                        aria-label={t("certificatesEditor.removeA11y", {
                          name,
                        })}
                        className="text-sm font-medium text-error"
                      >
                        {t("common.delete")}
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={certDraft}
                      onChange={(e) =>
                        setCertDraft(
                          e.target.value.slice(0, SHORT_TEXT_MAX_LENGTH),
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCertificate();
                        }
                      }}
                      placeholder={t("certificatesEditor.draftPlaceholder")}
                      className="flex-1 rounded-input border border-line px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={addCertificate}
                      disabled={!certDraft.trim()}
                      className="rounded-input border border-primary px-4 py-2 text-sm font-medium text-primary disabled:opacity-50"
                    >
                      {t("certificatesEditor.addButton")}
                    </button>
                  </div>
                </div>
                <label className={fieldLabel}>
                  {t("medicalBook.label")}
                  <span className="block text-xs font-normal text-ink-secondary">
                    {t("medicalBook.helper")}
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="date"
                      value={form.medicalBookExpiresOn}
                      min={toIso(new Date())}
                      onChange={(e) =>
                        patch({ medicalBookExpiresOn: e.target.value })
                      }
                      className="flex-1 rounded-input border border-line px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                    {form.medicalBookExpiresOn && (
                      <button
                        type="button"
                        onClick={() => patch({ medicalBookExpiresOn: "" })}
                        className="text-sm font-medium text-primary"
                      >
                        {t("common.clear")}
                      </button>
                    )}
                  </div>
                </label>
              </>
            ) : (
              <>
                {profile.bio && <p className="text-sm">{profile.bio}</p>}
                {profile.yearsOfExperience != null &&
                  profile.yearsOfExperience > 0 && (
                    <p className="mt-2 text-sm">
                      {t("baristaProfileScreen.experience", {
                        years: t("barista.experienceYears", {
                          count: profile.yearsOfExperience,
                        }),
                      })}
                    </p>
                  )}
                {(equipmentGroups.length > 0 || otherEquipment.length > 0) && (
                  <>
                    <p className={label}>
                      {t("baristaProfileScreen.equipment")}
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
                    <ol className="list-inside list-decimal text-sm">
                      {profile.certifications.map((cert, i) => (
                        <li key={`${i}-${cert}`}>{cert}</li>
                      ))}
                    </ol>
                  </>
                )}
                <p className={label}>{t("medicalBook.label")}</p>
                <span
                  className={`inline-block rounded-chip px-2.5 py-1 text-xs font-medium ${medicalBadge[medicalStatus]}`}
                >
                  {t(`medicalBook.status.${medicalStatus}`, {
                    date: profile.medicalBookExpiresOn
                      ? formatDateOnly(profile.medicalBookExpiresOn, locale)
                      : "",
                  })}
                </span>
              </>
            )}
          </div>

          <div className="mt-4 rounded-card border border-line bg-white p-4">
            {editing ? (
              <>
                <h2 className={sectionTitle}>
                  {t("barista.workExperience.title")}
                </h2>
                <WorkExperienceEditor
                  drafts={form.workExperiences}
                  errors={workExperienceErrors}
                  onChange={(next) => {
                    patch({ workExperiences: next });
                    if (workExperienceErrors.length > 0)
                      setWorkExperienceErrors([]);
                  }}
                />
              </>
            ) : (
              <WorkExperienceList
                experiences={workExperiences}
                locale={locale}
              />
            )}
          </div>

          <div className="mt-4 rounded-card border border-line bg-white p-4">
            <h2 className={sectionTitle}>
              {t("baristaProfileScreen.workPreferences")}
            </h2>
            {editing ? (
              <>
                <span className={fieldLabel}>
                  {t("baristaProfileScreen.preferredMetro")}
                </span>
                <button
                  type="button"
                  onClick={() => setMetroOpen(true)}
                  className="mt-1 w-full rounded-input border border-line px-3 py-2 text-left text-sm hover:border-primary"
                >
                  Ⓜ {metroLabel}
                </button>
                <span className={fieldLabel}>
                  {t("baristaProfileScreen.preferredShiftTimes")}
                </span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {SHIFT_TIMES.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        patch({ shiftTimes: toggleIn(form.shiftTimes, value) })
                      }
                      className={chip(form.shiftTimes.includes(value))}
                    >
                      {t(`shiftTimes.${value}Range`)}
                    </button>
                  ))}
                </div>
                <label className={fieldLabel}>
                  {t("baristaProfileScreen.hourlyRateMin")}
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.hourlyRateMin}
                    onChange={(e) =>
                      patch({
                        hourlyRateMin: sanitizeDigitsInput(
                          e.target.value,
                          RATE_MAX_DIGITS,
                        ),
                      })
                    }
                    placeholder={t("baristaSetup.minPlaceholder")}
                    className={input}
                  />
                </label>
                <label className={fieldLabel}>
                  {t("baristaSetup.fieldAvailableFrom")}
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="date"
                      value={form.availableFromDate}
                      min={toIso(new Date())}
                      onChange={(e) =>
                        patch({ availableFromDate: e.target.value })
                      }
                      className="flex-1 rounded-input border border-line px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                    {form.availableFromDate && (
                      <button
                        type="button"
                        onClick={() => patch({ availableFromDate: "" })}
                        className="text-sm font-medium text-primary"
                      >
                        {t("common.clear")}
                      </button>
                    )}
                  </div>
                </label>
                <span className={fieldLabel}>
                  {t("baristaSetup.fieldWorkloadTypes")}
                </span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {WORKLOAD_TYPES.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        patch({
                          workloadTypes: toggleIn(form.workloadTypes, value),
                        })
                      }
                      className={chip(form.workloadTypes.includes(value))}
                    >
                      {t(`workloadType.${value}`)}
                    </button>
                  ))}
                </div>
                <span className={fieldLabel}>
                  {t("baristaSetup.fieldAvailableDays")}
                </span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() =>
                        patch({
                          availableDays: toggleIn(form.availableDays, day),
                        })
                      }
                      className={chip(form.availableDays.includes(day))}
                    >
                      {t(`dayOfWeek.${day}`)}
                    </button>
                  ))}
                </div>
                <label className="mt-4 flex cursor-pointer items-center justify-between border-t border-line pt-3 text-sm font-medium">
                  {t("baristaProfileScreen.actively")}
                  <input
                    type="checkbox"
                    checked={form.isActivelyLooking}
                    onChange={(e) =>
                      patch({ isActivelyLooking: e.target.checked })
                    }
                    className="h-5 w-5 accent-primary"
                  />
                </label>
              </>
            ) : profile.preferredMetroStations.length === 0 &&
              profile.preferredShiftTimes.length === 0 &&
              profile.hourlyRateMin == null &&
              !profile.availableFromDate &&
              profile.workloadTypes.length === 0 &&
              profile.availableDays.length === 0 ? (
              <p className="text-sm text-ink-secondary">
                {t("common.notSpecified")}
              </p>
            ) : (
              <>
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
                    <p className={label}>
                      {t("baristaProfileScreen.shiftTimes")}
                    </p>
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
                      {t("baristaProfileScreen.hourlyRate")}
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
                    <p className={label}>
                      {t("baristaSetup.fieldAvailableFrom")}
                    </p>
                    <p className="text-sm">
                      {formatDateOnly(profile.availableFromDate, locale)}
                    </p>
                  </>
                )}
                {profile.workloadTypes.length > 0 && (
                  <>
                    <p className={label}>
                      {t("baristaSetup.fieldWorkloadTypes")}
                    </p>
                    <p className="text-sm">
                      {profile.workloadTypes
                        .map((w) => t(`workloadType.${w}`))
                        .join(", ")}
                    </p>
                  </>
                )}
                {profile.availableDays.length > 0 && (
                  <>
                    <p className={label}>
                      {t("baristaSetup.fieldAvailableDays")}
                    </p>
                    <p className="text-sm">
                      {profile.availableDays
                        .map((d) => t(`dayOfWeek.${d}`))
                        .join(", ")}
                    </p>
                  </>
                )}
              </>
            )}
          </div>

          <div className="mt-4 rounded-card border border-line bg-white p-4">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-base font-semibold">
                {t("baristaProfileScreen.portfolio")}
              </h2>
              <span className="text-xs text-ink-secondary">
                {t("portfolioPhotos.counter", {
                  count: profile.portfolioPhotos.length,
                  max: PHOTO_LIMIT,
                })}
              </span>
            </div>
            {profile.portfolioPhotos.length === 0 ? (
              <p className="text-sm text-ink-secondary">
                {t("baristaProfileScreen.noPortfolioPhotos")}
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {profile.portfolioPhotos.map((url, index) => (
                  <div key={url} className="relative aspect-square">
                    <button
                      type="button"
                      onClick={() =>
                        setLightbox({ photos: profile.portfolioPhotos, index })
                      }
                      aria-label={t(
                        "baristaProfileScreen.viewPortfolioPhotoA11y",
                        { index: index + 1 },
                      )}
                      className="h-full w-full"
                    >
                      <img
                        src={transformedImageUrl(url, 240)}
                        alt=""
                        className="h-full w-full rounded-input object-cover"
                      />
                    </button>
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
            <button
              type="button"
              onClick={handleAddPortfolioPhotos}
              disabled={
                portfolioUploading ||
                profile.portfolioPhotos.length >= PHOTO_LIMIT
              }
              className="mt-3 text-sm font-medium text-primary disabled:opacity-50"
            >
              {portfolioUploading
                ? t("baristaProfileScreen.uploading")
                : t("baristaProfileScreen.addPortfolioPhoto")}
            </button>
          </div>

          {editing && (
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="rounded-card border border-line px-4 py-2.5 text-sm font-medium"
              >
                {t("baristaProfileScreen.cancel")}
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving}
                className="flex-1 rounded-card bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isSaving
                  ? t("baristaProfileScreen.saving")
                  : t("baristaProfileScreen.save")}
              </button>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-4 text-sm text-error">
              {error}
            </p>
          )}

          {editing && (
            <MetroFilterModal
              open={metroOpen}
              city={form.city}
              value={form.metroStations}
              userLocation={userLocation}
              onCityChange={(next) => {
                if (next === form.city) return;
                patch({ city: next, metroStations: [] });
              }}
              onChange={(stations) => patch({ metroStations: stations })}
              onClose={() => setMetroOpen(false)}
            />
          )}
        </>
      )}

      {lightbox && (
        <ImageLightbox
          photos={lightbox.photos}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
