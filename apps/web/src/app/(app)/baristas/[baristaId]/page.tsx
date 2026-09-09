"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { BaristaProfileService } from "@bystrobarista/core/services/BaristaProfileService";
import { WorkExperienceService } from "@bystrobarista/core/services/WorkExperienceService";
import { ReviewService } from "@bystrobarista/core/services/ReviewService";
import { JobService } from "@bystrobarista/core/services/JobService";
import { JobOfferService } from "@bystrobarista/core/services/JobOfferService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import { isMetroAnySelection } from "@bystrobarista/core/config/metroFilter";
import { getCityLabel, isCityCode } from "@bystrobarista/core/types/city";
import { MetroService } from "@bystrobarista/core/utils/metro";
import type { BaristaProfileId, UserId } from "@bystrobarista/core/types/ids";
import { computeMedicalBookStatus } from "@bystrobarista/core/utils/medicalBook";
import { ReportButton } from "@/components/ReportButton";
import { StarRow } from "@/components/StarRow";
import { ImageLightbox } from "@/components/ImageLightbox";
import { WorkExperienceList } from "@/components/WorkExperienceList";
import { transformedImageUrl } from "@/lib/imageTransform";
import { formatDateOnly } from "@/lib/dates";

const sectionTitle = "mb-2 text-base font-semibold";
const chipClass =
  "rounded-chip bg-bg-secondary px-2.5 py-1 text-xs font-medium";

const MEDICAL_BOOK_CLASSES: Record<string, string> = {
  valid: "bg-success/15 text-success",
  expiringSoon: "bg-warning/15 text-warning",
  expired: "bg-error/15 text-error",
  none: "bg-bg-secondary text-ink-secondary",
};

// Web port of mobile's ViewBaristaProfileScreen: public barista profile for
// businesses with the offer-job CTA (gated on isActivelyLooking and on
// having at least one open job without a pending offer to this barista).
export default function ViewBaristaProfilePage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
  const params = useParams<{ baristaId: string }>();
  const baristaId = params.baristaId as UserId;
  const currentUser = useAuthStore((s) => s.user);

  const profileQuery = useQuery({
    queryKey: ["baristaProfile", "public", baristaId],
    queryFn: () => BaristaProfileService.getProfileByUserId(baristaId),
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
    queryKey: ["reviews", "aggregate", baristaId],
    queryFn: () => ReviewService.getAggregateForUser(baristaId),
  });

  const reliabilityQuery = useQuery({
    queryKey: ["baristaReliability", baristaId],
    queryFn: () =>
      BaristaProfileService.getReliabilityScore(baristaId).catch(() => null),
  });

  const isBusiness = currentUser?.accountType === "business";
  const [lightbox, setLightbox] = useState<{
    photos: string[];
    index: number;
  } | null>(null);

  const openJobsQuery = useQuery({
    queryKey: ["jobs", "byOwnerOpen", currentUser?.id],
    queryFn: () => JobService.getJobsByOwnerId(currentUser?.id as string, true),
    enabled: isBusiness,
  });

  const pendingOffersQuery = useQuery({
    queryKey: ["offers", "toBarista", currentUser?.id, baristaId],
    queryFn: () =>
      JobOfferService.getPendingOffersFromOwnerToBarista(
        currentUser?.id as UserId,
        baristaId,
      ).catch(() => []),
    enabled: isBusiness,
  });

  if (profileQuery.isPending) {
    return <div className="h-64 animate-pulse rounded-card bg-bg-secondary" />;
  }

  if (!profile) {
    return (
      <p className="py-16 text-center text-sm text-ink-secondary">
        {t("viewBarista.errorNotFound")}
      </p>
    );
  }

  const aggregate = aggregateQuery.data;
  const reliability = reliabilityQuery.data;
  const openJobs = openJobsQuery.data ?? [];
  const offeredJobIds = new Set(
    (pendingOffersQuery.data ?? []).map((o) => o.jobId as string),
  );
  const hasOfferableJobs = openJobs.some((j) => !offeredJobIds.has(j.id));

  const medicalStatus = computeMedicalBookStatus(profile.medicalBookExpiresOn);
  const medicalDate = profile.medicalBookExpiresOn
    ? formatDateOnly(profile.medicalBookExpiresOn, locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const longDate = (iso: string): string =>
    formatDateOnly(iso, locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <div className="rounded-card border border-line bg-white p-4">
        <div className="flex items-center gap-4">
          {profile.avatarUrl ? (
            <button
              type="button"
              onClick={() =>
                setLightbox({ photos: [profile.avatarUrl as string], index: 0 })
              }
              aria-label={t("viewBarista.viewAvatarA11y")}
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
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold">
              {profile.firstName} {profile.lastName}
            </p>
            <p className="text-sm text-ink-secondary">
              {isCityCode(profile.city)
                ? getCityLabel(profile.city, i18n.language)
                : profile.city}
            </p>
            {profile.yearsOfExperience != null &&
              profile.yearsOfExperience > 0 && (
                <p className="text-sm">
                  {t("barista.experienceYears", {
                    count: profile.yearsOfExperience,
                  })}
                </p>
              )}
            {aggregate && aggregate.reviewCount > 0 && (
              <StarRow
                rating={aggregate.averageRating}
                count={aggregate.reviewCount}
                showValue
              />
            )}
            {reliability && (
              <p className="mt-0.5 text-xs text-ink-secondary">
                {t("reliability.sectionTitle")}:{" "}
                {reliability.reliabilityScore.toFixed(1)}/5
                {reliability.incidents30d > 0 &&
                  ` · ${t("reliability.incidents", {
                    count: reliability.incidents30d,
                  })}`}
              </p>
            )}
            {isBusiness && (
              // Mobile parity: a business can flag a barista from the
              // profile itself, before any hire or conversation exists.
              <div className="mt-2">
                <ReportButton
                  targetType="user"
                  targetId={profile.userId}
                  variant="icon"
                />
              </div>
            )}
          </div>
        </div>
        <Link
          href={`/reviews/${baristaId}`}
          className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm font-medium hover:text-primary"
        >
          {t("viewBarista.allReviews")}
          <span aria-hidden="true">›</span>
        </Link>
      </div>

      {profile.bio && (
        <div className="mt-4 rounded-card border border-line bg-white p-4">
          <h2 className={sectionTitle}>{t("viewBarista.about")}</h2>
          <p className="whitespace-pre-wrap text-sm">{profile.bio}</p>
        </div>
      )}

      {workExperiences.length > 0 && (
        <div className="mt-4 rounded-card border border-line bg-white p-4">
          <WorkExperienceList experiences={workExperiences} locale={locale} />
        </div>
      )}

      {profile.equipmentExperience.length > 0 && (
        <div className="mt-4 rounded-card border border-line bg-white p-4">
          <h2 className={sectionTitle}>
            {t("viewBarista.equipmentExperience")}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {profile.equipmentExperience.map((equipment) => (
              <span key={equipment} className={chipClass}>
                {equipment}
              </span>
            ))}
          </div>
        </div>
      )}

      {profile.certifications.length > 0 && (
        <div className="mt-4 rounded-card border border-line bg-white p-4">
          <h2 className={sectionTitle}>{t("viewBarista.certifications")}</h2>
          {profile.certifications.map((certification, index) => (
            <p key={certification} className="text-sm leading-relaxed">
              {index + 1}. {certification}
            </p>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-card border border-line bg-white p-4">
        <h2 className={sectionTitle}>{t("medicalBook.label")}</h2>
        <span
          className={`inline-block rounded-chip px-2.5 py-1 text-xs font-medium ${MEDICAL_BOOK_CLASSES[medicalStatus]}`}
        >
          {t(`medicalBook.status.${medicalStatus}`, { date: medicalDate })}
        </span>
      </div>

      {isCityCode(profile.city) &&
        MetroService.hasMetro(profile.city) &&
        profile.preferredMetroStations.length > 0 && (
          <div className="mt-4 rounded-card border border-line bg-white p-4">
            <h2 className={sectionTitle}>{t("viewBarista.preferredMetro")}</h2>
            <div className="flex flex-wrap gap-1.5">
              {isMetroAnySelection(profile.preferredMetroStations) ? (
                <span className={chipClass}>{t("metro.anyOptionTitle")}</span>
              ) : (
                profile.preferredMetroStations.map((station) => (
                  <span key={station} className={chipClass}>
                    {station}
                  </span>
                ))
              )}
            </div>
          </div>
        )}

      {profile.preferredShiftTimes.length > 0 && (
        <div className="mt-4 rounded-card border border-line bg-white p-4">
          <h2 className={sectionTitle}>
            {t("viewBarista.preferredShiftTimes")}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {profile.preferredShiftTimes.map((shift) => (
              <span key={shift} className={chipClass}>
                {t(`shiftTimes.${shift}`)}
              </span>
            ))}
          </div>
        </div>
      )}

      {(profile.hourlyRateMin != null || profile.hourlyRateMax != null) && (
        <div className="mt-4 rounded-card border border-line bg-white p-4">
          <h2 className={sectionTitle}>{t("viewBarista.hourlyRate")}</h2>
          <p className="text-sm font-semibold text-primary">
            {profile.hourlyRateMin != null &&
            profile.hourlyRateMax != null &&
            profile.hourlyRateMin !== profile.hourlyRateMax
              ? `${profile.hourlyRateMin.toLocaleString(locale)} RUB – ${profile.hourlyRateMax.toLocaleString(locale)} RUB`
              : `${(profile.hourlyRateMin ?? profile.hourlyRateMax)?.toLocaleString(locale)} RUB`}
          </p>
        </div>
      )}

      {profile.availableFromDate && (
        <div className="mt-4 rounded-card border border-line bg-white p-4">
          <h2 className={sectionTitle}>
            {t("baristaSetup.fieldAvailableFrom")}
          </h2>
          <p className="text-sm">{longDate(profile.availableFromDate)}</p>
        </div>
      )}

      {profile.workloadTypes.length > 0 && (
        <div className="mt-4 rounded-card border border-line bg-white p-4">
          <h2 className={sectionTitle}>
            {t("baristaSetup.fieldWorkloadTypes")}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {profile.workloadTypes.map((type) => (
              <span key={type} className={chipClass}>
                {t(`workloadType.${type}`)}
              </span>
            ))}
          </div>
        </div>
      )}

      {profile.availableDays.length > 0 && (
        <div className="mt-4 rounded-card border border-line bg-white p-4">
          <h2 className={sectionTitle}>
            {t("baristaSetup.fieldAvailableDays")}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {profile.availableDays.map((day) => (
              <span key={day} className={chipClass}>
                {t(`dayOfWeek.${day}`)}
              </span>
            ))}
          </div>
        </div>
      )}

      {profile.preferredSchedulePatterns.length > 0 && (
        <div className="mt-4 rounded-card border border-line bg-white p-4">
          <h2 className={sectionTitle}>
            {t("baristaSetup.fieldSchedulePatterns")}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {profile.preferredSchedulePatterns.map((pattern) => (
              <span key={pattern} className={chipClass}>
                {pattern}
              </span>
            ))}
          </div>
        </div>
      )}

      {profile.portfolioPhotos.length > 0 && (
        <div className="mt-4 rounded-card border border-line bg-white p-4">
          <h2 className={sectionTitle}>{t("viewBarista.portfolio")}</h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {profile.portfolioPhotos.map((url, i) => (
              <button
                key={url}
                type="button"
                onClick={() =>
                  setLightbox({ photos: profile.portfolioPhotos, index: i })
                }
                className="aspect-square"
              >
                <img
                  src={transformedImageUrl(url, 240)}
                  alt=""
                  className="h-full w-full rounded-input object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {isBusiness && profile.isActivelyLooking && (
        <div className="mt-6">
          {hasOfferableJobs ? (
            <Link
              href={`/baristas/${baristaId}/offer`}
              data-tour="barista.offer"
              className="block rounded-card bg-primary px-4 py-3 text-center text-sm font-semibold text-white"
            >
              {t("viewBarista.offerJob")}
            </Link>
          ) : (
            <>
              <button
                type="button"
                disabled
                className="w-full rounded-card bg-primary px-4 py-3 text-sm font-semibold text-white opacity-50"
              >
                {t("viewBarista.offerJob")}
              </button>
              <p className="mt-1 text-center text-xs text-ink-secondary">
                {t("viewBarista.offerJobAllOffered")}
              </p>
            </>
          )}
        </div>
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
