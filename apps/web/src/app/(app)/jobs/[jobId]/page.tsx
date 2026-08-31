"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useParams } from "next/navigation";
import React from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import { JobService } from "@bystrobarista/core/services/JobService";
import { ReviewService } from "@bystrobarista/core/services/ReviewService";
import { ApplicationService } from "@bystrobarista/core/services/ApplicationService";
import { BaristaProfileService } from "@bystrobarista/core/services/BaristaProfileService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import type { Job } from "@bystrobarista/core/types/job";
import type { UserId } from "@bystrobarista/core/types/ids";
import { StarRow } from "@/components/StarRow";
import { BusinessJobDetails } from "@/components/BusinessJobDetails";
import { transformedImageUrl } from "@/lib/imageTransform";

// Same gate as mobile JobDetailsScreen.
const MIN_COMPLETENESS_TO_APPLY = 20;

const STATUS_BADGE: Record<string, string> = {
  accepted: "bg-[#10B981]",
  rejected: "bg-[#EF4444]",
  pending: "bg-[#F59E0B]",
  under_review: "bg-[#F59E0B]",
  withdrawn: "bg-[#6B7280]",
};

const statusLabel = (status: string, t: TFunction): string => {
  switch (status) {
    case "pending":
      return t("jobDetails.status.pending");
    case "under_review":
      return t("jobDetails.status.underReview");
    case "accepted":
      return t("jobDetails.status.accepted");
    case "rejected":
      return t("jobDetails.status.rejected");
    case "withdrawn":
      return t("jobDetails.status.withdrawn");
    default:
      return status;
  }
};

const compensationLine = (job: Job, t: TFunction, locale: string): string => {
  const amount = `₽${job.compensation.amount.toLocaleString(locale)}`;
  switch (job.compensation.type) {
    case "hourly":
      return t("jobDetails.perHour", { amount });
    case "daily":
      return t("jobDetails.perDay", { amount });
    default:
      return amount;
  }
};

// Shared route: barista sees the public job view with the apply flow,
// business owners see their management view (status actions, applicants).
export default function JobDetailsPage(): React.JSX.Element {
  const accountType = useAuthStore((s) => s.user?.accountType);
  const params = useParams<{ jobId: string }>();
  if (accountType === "business") {
    return <BusinessJobDetails jobId={params.jobId} />;
  }
  return <BaristaJobDetails />;
}

function BaristaJobDetails(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;
  const userId = useAuthStore((s) => s.user?.id);

  const jobQuery = useQuery({
    queryKey: ["jobs", "byId", jobId],
    queryFn: () => JobService.getJobById(jobId),
  });

  const job = jobQuery.data;

  const aggregateQuery = useQuery({
    queryKey: ["reviews", "aggregate", job?.businessOwnerId],
    queryFn: () =>
      ReviewService.getAggregateForUser(job?.businessOwnerId as UserId),
    enabled: Boolean(job?.businessOwnerId),
  });

  const existingApplicationQuery = useQuery({
    queryKey: ["applications", "exists", jobId, userId],
    queryFn: () =>
      ApplicationService.checkApplicationExists(jobId, userId as string),
    enabled: Boolean(userId),
  });

  const profileQuery = useQuery({
    queryKey: ["baristaProfile", userId],
    queryFn: () => BaristaProfileService.getProfileByUserId(userId as string),
    enabled: Boolean(userId),
  });

  if (jobQuery.isPending) {
    return (
      <div className="animate-pulse">
        <div className="mb-3 h-6 w-2/3 rounded bg-bg-secondary" />
        <div className="mb-3 h-4 w-1/2 rounded bg-bg-secondary" />
        <div className="h-40 rounded-card bg-bg-secondary" />
      </div>
    );
  }

  if (jobQuery.isError || !job) {
    return (
      <div className="py-16 text-center">
        <p className="mb-3 text-ink-secondary">{t("jobDetails.loadFailed")}</p>
        <button
          type="button"
          onClick={() => void jobQuery.refetch()}
          className="rounded-input bg-primary px-4 py-2 text-sm font-medium text-white"
        >
          {t("jobDetails.retry")}
        </button>
      </div>
    );
  }

  const aggregate = aggregateQuery.data;
  const existingApplication = existingApplicationQuery.data ?? null;
  const hasCheckedApplication = existingApplicationQuery.isSuccess;
  const completeness = profileQuery.data?.profileCompleteness ?? 0;
  const profileTooEmpty =
    profileQuery.isSuccess && completeness < MIN_COMPLETENESS_TO_APPLY;

  const shiftLine =
    job.shiftDetails.kind === "permanent"
      ? [
          job.shiftDetails.startDate &&
            t("jobDetails.startDatePermanent", {
              date: new Date(job.shiftDetails.startDate).toLocaleDateString(
                locale,
              ),
            }),
          typeof job.shiftDetails.hoursPerWeek === "number" &&
            t("jobDetails.hoursPerWeek", {
              hours: job.shiftDetails.hoursPerWeek,
            }),
          job.shiftDetails.scheduleStartTime &&
            job.shiftDetails.scheduleEndTime &&
            t("jobDetails.scheduleTimes", {
              start: job.shiftDetails.scheduleStartTime,
              end: job.shiftDetails.scheduleEndTime,
            }),
        ]
          .filter(Boolean)
          .join(" · ")
      : [
          job.shiftDetails.startDate &&
            `${t("jobDetails.date")}: ${new Date(job.shiftDetails.startDate).toLocaleDateString(locale)}`,
          `${t("jobDetails.time")}: ${job.shiftDetails.startTime} – ${job.shiftDetails.endTime}`,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <h1 className="text-2xl font-bold">{job.title}</h1>

      <div className="mt-1 flex items-center gap-2 text-sm text-ink-secondary">
        <span>
          {job.businessName}
          {job.branchName && ` • ${job.branchName}`}
        </span>
        {aggregate && aggregate.reviewCount > 0 && (
          <StarRow
            rating={aggregate.averageRating}
            count={aggregate.reviewCount}
            showValue
          />
        )}
      </div>

      {job.businessOwnerId && (
        <Link
          href={`/businesses/${job.businessOwnerId}`}
          className="mt-1 inline-block text-sm text-primary"
        >
          {t("jobDetails.viewBusinessProfile")}
        </Link>
      )}

      {(job.branchPhotos?.length ?? 0) > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto">
          {job.branchPhotos!.map((photo, i) => (
            <img
              key={i}
              src={transformedImageUrl(photo, 160)}
              alt=""
              className="h-40 w-40 shrink-0 rounded-card bg-bg-secondary object-cover"
              loading="lazy"
            />
          ))}
        </div>
      )}

      <section className="mt-6">
        <h2 className="mb-1 text-base font-semibold">
          {t("jobDetails.compensation")}
        </h2>
        <p className="text-lg font-semibold text-primary">
          {compensationLine(job, t, locale)}
        </p>
      </section>

      <section className="mt-6">
        <h2 className="mb-1 text-base font-semibold">
          {t("jobDetails.shiftDetails")}
        </h2>
        <p className="text-sm">{shiftLine}</p>
      </section>

      {(job.location?.address || job.metroStation) && (
        <section className="mt-6">
          <h2 className="mb-1 text-base font-semibold">
            {t("jobDetails.location")}
          </h2>
          {job.metroStation && (
            <p className="text-sm">
              <span aria-hidden="true" className="mr-1 text-primary">
                Ⓜ
              </span>
              {job.metroStation}
            </p>
          )}
          {job.location?.address && (
            <p className="text-sm text-ink-secondary">{job.location.address}</p>
          )}
        </section>
      )}

      {job.description && (
        <section className="mt-6">
          <h2 className="mb-1 text-base font-semibold">
            {t("jobDetails.description")}
          </h2>
          <p className="whitespace-pre-line text-sm">{job.description}</p>
        </section>
      )}

      {job.requirements.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-1 text-base font-semibold">
            {t("jobDetails.requirements")}
          </h2>
          <ul className="list-inside list-disc text-sm">
            {job.requirements.map((req, i) => (
              <li key={i}>{req}</li>
            ))}
          </ul>
        </section>
      )}

      {job.requiredEquipmentExperience.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-1 text-base font-semibold">
            {t("jobDetails.requiredEquipment")}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {job.requiredEquipmentExperience.map((eq, i) => (
              <span
                key={i}
                className="rounded-chip bg-bg-secondary px-2 py-1 text-xs text-ink-secondary"
              >
                {eq}
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-14 border-t border-line bg-white p-4 md:bottom-0">
        <div className="mx-auto max-w-2xl">
          {existingApplication ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-secondary">
                {t("jobDetails.applicationStatus")}
              </span>
              <span
                className={`rounded-chip px-3 py-1 text-sm font-semibold text-white ${
                  STATUS_BADGE[existingApplication.status] ?? "bg-ink-secondary"
                }`}
              >
                {statusLabel(existingApplication.status, t)}
              </span>
            </div>
          ) : profileTooEmpty ? (
            <div className="text-center">
              <p className="mb-2 text-sm text-ink-secondary">
                {t("jobDetails.applyBlockedBody", {
                  min: MIN_COMPLETENESS_TO_APPLY,
                  current: completeness,
                  defaultValue:
                    "Профиль заполнен на {{current}}%. Чтобы откликаться на вакансии, его нужно заполнить минимум на {{min}}%.",
                })}
              </p>
              <Link
                href="/profile/edit"
                className="inline-block rounded-card bg-primary px-6 py-3 text-sm font-semibold text-white"
              >
                {t("jobFeed.profileBannerTitle")}
              </Link>
            </div>
          ) : (
            <Link
              href={`/jobs/${job.id}/apply`}
              aria-disabled={!hasCheckedApplication}
              className={`block rounded-card bg-primary px-6 py-3 text-center text-sm font-semibold text-white ${
                hasCheckedApplication ? "" : "pointer-events-none opacity-50"
              }`}
            >
              {t("jobDetails.applyCta")}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
