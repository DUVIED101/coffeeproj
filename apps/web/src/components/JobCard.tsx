"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import React from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { Job } from "@bystrobarista/core/types/job";
import type { UserReviewAggregate } from "@bystrobarista/core/types/review";
import { StarRow } from "./StarRow";
import { transformedImageUrl } from "@/lib/imageTransform";

type JobCardProps = {
  job: Job;
  ownerAggregate?: UserReviewAggregate;
  alreadyApplied?: boolean;
};

const formatCurrency = (amount: number, locale: string): string =>
  `₽${amount.toLocaleString(locale)}`;

const formatShiftDate = (date: string, locale: string): string => {
  const dateObj = new Date(date);
  return `${dateObj.getDate()} ${dateObj.toLocaleString(locale, { month: "short" })}`;
};

const STATUS_CLASSES: Record<Job["status"], string> = {
  open: "bg-success",
  in_review: "bg-warning",
  filled: "bg-ink-secondary",
  expired: "bg-error",
  cancelled: "bg-error",
};

const getStatusText = (status: Job["status"], t: TFunction): string => {
  switch (status) {
    case "open":
      return t("jobStatus.open");
    case "in_review":
      return t("jobStatus.inReview");
    case "filled":
      return t("jobStatus.filled");
    case "expired":
      return t("jobStatus.expired");
    case "cancelled":
      return t("jobStatus.cancelled");
    default:
      return status;
  }
};

const getCompensationText = (
  job: Job,
  t: TFunction,
  locale: string,
): string => {
  const formattedAmount = formatCurrency(job.compensation.amount, locale);
  switch (job.compensation.type) {
    case "hourly":
      return t("compensation.hourly", { amount: formattedAmount });
    case "daily":
      return t("compensation.daily", { amount: formattedAmount });
    default:
      return formattedAmount;
  }
};

export const JobCard = React.memo<JobCardProps>(function JobCard({
  job,
  ownerAggregate,
  alreadyApplied,
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ru" ? "ru-RU" : "en-US";

  const statusText = getStatusText(job.status, t);
  const jobTypeText =
    job.jobType === "temporary"
      ? t("filters.jobType.temporary")
      : t("filters.jobType.permanent");
  const compensationText = getCompensationText(job, t, locale);
  const shiftDate = job.shiftDetails.startDate
    ? formatShiftDate(job.shiftDetails.startDate, locale)
    : t("jobDetails.startDateUnspecified");
  const shiftSubtitle =
    job.shiftDetails.kind === "permanent"
      ? typeof job.shiftDetails.hoursPerWeek === "number"
        ? t("jobDetails.hoursPerWeekShort", {
            hours: job.shiftDetails.hoursPerWeek,
          })
        : job.shiftDetails.scheduleStartTime && job.shiftDetails.scheduleEndTime
          ? t("jobDetails.scheduleTimesShort", {
              start: job.shiftDetails.scheduleStartTime,
              end: job.shiftDetails.scheduleEndTime,
            })
          : ""
      : `${job.shiftDetails.startTime} - ${job.shiftDetails.endTime}`;

  const visibleEquipment = job.requiredEquipmentExperience.slice(0, 3);
  const remainingEquipmentCount = job.requiredEquipmentExperience.length - 3;
  const hasUrgentTag = job.tags.includes("urgent");
  const hasFlexibleTag = job.tags.includes("flexible");
  const hasTrainingTag = job.tags.includes("training-provided");
  const branchThumbUri = job.branchPhotos?.[0];
  const hasDistance = job.distance != null;

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="mb-3 block rounded-card border border-line bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="flex-1 text-lg font-bold">{job.title}</h3>
        <div className="flex shrink-0 items-center gap-1.5">
          {alreadyApplied && (
            <span className="rounded-chip bg-success/15 px-2 py-1 text-xs font-semibold text-success">
              {t("jobs.alreadyApplied")}
            </span>
          )}
          <span
            className={`rounded-chip px-2 py-1 text-xs font-semibold text-white ${STATUS_CLASSES[job.status]}`}
          >
            {statusText}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="mb-3">
            <p className="text-sm text-ink-secondary">
              {job.businessName}
              {job.branchName && ` • ${job.branchName}`}
            </p>
            {ownerAggregate && ownerAggregate.reviewCount > 0 && (
              <StarRow
                rating={ownerAggregate.averageRating}
                count={ownerAggregate.reviewCount}
                showValue
              />
            )}
          </div>

          <div className="mb-2 flex flex-wrap gap-1.5">
            <span className="rounded-chip bg-bg-secondary px-2.5 py-1 text-xs font-medium">
              {jobTypeText}
            </span>
            {hasUrgentTag && (
              <span className="rounded-chip bg-error px-2.5 py-1 text-xs font-medium text-white">
                {t("jobs.urgent")}
              </span>
            )}
            {hasFlexibleTag && (
              <span className="rounded-chip bg-[rgba(52,152,219,0.14)] px-2.5 py-1 text-xs font-medium text-[#2c7fb8]">
                {t("createJob.tags.flexible")}
              </span>
            )}
            {hasTrainingTag && (
              <span className="rounded-chip bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
                {t("createJob.tags.training-provided")}
              </span>
            )}
          </div>

          <p className="mb-2 text-sm">
            {shiftDate} • {shiftSubtitle}
          </p>
          <p className="mb-2 text-base font-semibold text-primary">
            {compensationText}
          </p>

          {job.metroStation && (
            <p className="mb-2 text-sm">
              <span aria-hidden="true" className="mr-1 text-primary">
                Ⓜ
              </span>
              {job.metroStation}
            </p>
          )}

          {job.location?.address && (
            <p className="mb-2 line-clamp-2 text-[13px] text-ink-secondary">
              {job.location.address}
            </p>
          )}

          {job.requiredEquipmentExperience.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {visibleEquipment.map((equipment, index) => (
                <span
                  key={index}
                  className="rounded-chip bg-bg-secondary px-2 py-1 text-xs text-ink-secondary"
                >
                  {equipment}
                </span>
              ))}
              {remainingEquipmentCount > 0 && (
                <span className="rounded-chip bg-bg-secondary px-2 py-1 text-xs text-ink-secondary">
                  +{remainingEquipmentCount}
                </span>
              )}
            </div>
          )}
        </div>

        {branchThumbUri && (
          <img
            src={transformedImageUrl(branchThumbUri, 96)}
            alt=""
            className="h-24 w-24 rounded-card bg-bg-secondary object-cover"
            loading="lazy"
          />
        )}
      </div>

      <div className="mt-2 border-t border-line pt-2 text-xs text-ink-secondary">
        {t("jobs.applicationsCount", { count: job.applicationCount ?? 0 })}
        {hasDistance && (
          <span className="ml-3">
            {t("jobFeed.distanceFromYou", {
              km: ((job.distance as number) / 1000).toFixed(1),
            })}
          </span>
        )}
      </div>
    </Link>
  );
});
