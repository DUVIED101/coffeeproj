"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPlatform } from "@bystrobarista/core/platform";
import { JobService } from "@bystrobarista/core/services/JobService";
import { JobOfferService } from "@bystrobarista/core/services/JobOfferService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import type { Job, JobStatus } from "@bystrobarista/core/types/job";
import type { JobId } from "@bystrobarista/core/types/ids";
import { transformedImageUrl } from "@/lib/imageTransform";

// Full weekday names (recurringDays) → the short dayOfWeek.* label keys.
const DAY_SHORT: Record<string, string> = {
  monday: "mon",
  tuesday: "tue",
  wednesday: "wed",
  thursday: "thu",
  friday: "fri",
  saturday: "sat",
  sunday: "sun",
};

const sectionTitle = "mb-2 text-base font-semibold";
const rowLabel = "text-sm text-ink-secondary";

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}): React.JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className={rowLabel}>{label}</span>
      <span
        className={`text-right text-sm ${strong ? "font-semibold text-primary" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

// Web port of mobile's business JobDetailsScreen: read view of an own job
// with status actions (mark filled / cancel / reopen), edit entry, and the
// applicants link. Rendered from /jobs/[jobId] when the viewer is a business.
export function BusinessJobDetails({
  jobId,
}: {
  jobId: string;
}): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const jobQuery = useQuery({
    queryKey: ["jobs", "byId", jobId],
    queryFn: () => JobService.getJobById(jobId),
  });

  const offersQuery = useQuery({
    queryKey: ["offers", "pendingForJob", jobId],
    queryFn: () =>
      JobOfferService.getPendingOffersForJob(jobId as JobId).catch(() => []),
  });

  const job = jobQuery.data;
  const pendingOfferCount = offersQuery.data?.length ?? 0;

  const changeStatus = async (
    nextStatus: JobStatus,
    confirmKey: "markFilled" | "cancel" | "reopen",
  ): Promise<void> => {
    if (!job || !userId) return;
    if (!window.confirm(t(`job.${confirmKey}.confirmBody`))) return;
    setIsUpdatingStatus(true);
    setError(null);
    try {
      await JobService.updateJobStatus(job.id, nextStatus, userId);
      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
      getPlatform().alert.show(
        t("common.success"),
        t(`job.${confirmKey}.success`),
        [{ text: t("common.ok") }],
      );
    } catch {
      setError(t("job.errors.updateFailed"));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (jobQuery.isPending) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="h-64 animate-pulse rounded-card bg-bg-secondary" />
      </div>
    );
  }

  if (!job) {
    return (
      <p className="py-16 text-center text-sm text-ink-secondary">
        {t("businessJobDetails.errorNotFound")}
      </p>
    );
  }

  const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString(locale);
  const shift = job.shiftDetails;
  // The management surface belongs to the owner only. Another business
  // following a job link gets the same sections read-only, with no
  // applicants/edit/status controls (server-side ownership checks are the
  // backstop; this removes the misleading UI).
  const isOwner = job.businessOwnerId === userId;
  const canViewApplicants =
    isOwner && ((job.applicationCount ?? 0) > 0 || pendingOfferCount > 0);
  const canClose =
    isOwner && (job.status === "open" || job.status === "in_review");
  const canReopen =
    isOwner &&
    (job.status === "filled" ||
      job.status === "cancelled" ||
      job.status === "expired");
  const canEdit = isOwner && job.status === "open";

  const compensationType =
    job.compensation.type === "hourly"
      ? t("businessJobDetails.perHour")
      : job.compensation.type === "daily"
        ? t("businessJobDetails.perDay")
        : t("businessJobDetails.fixed");

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <div className="rounded-card border border-line bg-white p-4">
        <h1 className="text-2xl font-bold">{job.title}</h1>
        <p className="mt-1 font-semibold">{job.businessName}</p>
        {job.branchName && (
          <p className="text-sm text-ink-secondary">{job.branchName}</p>
        )}
        {job.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {job.tags.map((tag) => (
              <span
                key={tag}
                className={`rounded-chip px-2.5 py-1 text-xs font-medium ${
                  tag === "urgent"
                    ? "bg-error text-white"
                    : "bg-bg-secondary text-ink"
                }`}
              >
                {t(`createJob.tags.${tag}`, { defaultValue: tag })}
              </span>
            ))}
          </div>
        )}
        <p className="mt-3 border-t border-line pt-3 text-sm">
          <span className="text-ink-secondary">
            {t("businessJobDetails.applicationsLabel")}:{" "}
          </span>
          {(job.applicationCount ?? 0) === 0
            ? t("businessJobDetails.noApplicantsYet")
            : t("businessJobDetails.applicantsCount", {
                count: job.applicationCount,
              })}
        </p>
      </div>

      {job.branchPhotos && job.branchPhotos.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto">
          {job.branchPhotos.map((url) => (
            <img
              key={url}
              src={transformedImageUrl(url, 320)}
              alt=""
              className="h-36 w-48 shrink-0 rounded-card object-cover"
            />
          ))}
        </div>
      )}

      <div className="mt-4 rounded-card border border-line bg-white p-4">
        <h2 className={sectionTitle}>{t("businessJobDetails.location")}</h2>
        <p className="text-sm">{job.location.address}</p>
        {job.metroStation && (
          <Row
            label={t("businessJobDetails.metroLabel")}
            value={job.metroStation}
            strong
          />
        )}
      </div>

      <div className="mt-4 rounded-card border border-line bg-white p-4">
        <h2 className={sectionTitle}>{t("businessJobDetails.shiftDetails")}</h2>
        {shift.kind === "permanent" ? (
          <>
            <Row
              label={t("businessJobDetails.startDatePermanent")}
              value={
                shift.startDate
                  ? formatDate(shift.startDate)
                  : t("businessJobDetails.startDateUnspecified")
              }
            />
            {typeof shift.hoursPerWeek === "number" && (
              <Row
                label={t("businessJobDetails.hoursPerWeek")}
                value={String(shift.hoursPerWeek)}
              />
            )}
            <Row
              label={t("businessJobDetails.preferredDays")}
              value={
                shift.preferredDays && shift.preferredDays.length > 0
                  ? shift.preferredDays
                      .map((d) => t(`createJob.weekdays.${d}`))
                      .join(", ")
                  : t("businessJobDetails.anyDay")
              }
            />
            {shift.scheduleStartTime && shift.scheduleEndTime && (
              <Row
                label={t("businessJobDetails.scheduleTimes")}
                value={`${shift.scheduleStartTime} — ${shift.scheduleEndTime}`}
              />
            )}
          </>
        ) : (
          <>
            <Row
              label={t("businessJobDetails.date")}
              value={
                shift.startDate
                  ? shift.endDate && shift.endDate !== shift.startDate
                    ? `${formatDate(shift.startDate)} — ${formatDate(shift.endDate)}`
                    : formatDate(shift.startDate)
                  : t("businessJobDetails.startDateUnspecified")
              }
            />
            <Row
              label={t("businessJobDetails.time")}
              value={`${shift.startTime} - ${shift.endTime}`}
            />
            {shift.isRecurring &&
              shift.recurringDays &&
              shift.recurringDays.length > 0 && (
                <Row
                  label={t("businessJobDetails.recurring")}
                  value={shift.recurringDays
                    .map((d) => t(`dayOfWeek.${DAY_SHORT[d] ?? d}`))
                    .join(", ")}
                />
              )}
          </>
        )}
        {shift.customSchedulePatterns &&
          shift.customSchedulePatterns.length > 0 && (
            <>
              <p className="mt-2 text-sm text-ink-secondary">
                {t("businessJobDetails.customSchedule")}
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {shift.customSchedulePatterns.map((pattern) => (
                  <span
                    key={pattern}
                    className="rounded-chip bg-bg-secondary px-2.5 py-1 text-xs font-medium"
                  >
                    {pattern}
                  </span>
                ))}
              </div>
            </>
          )}
      </div>

      <div className="mt-4 rounded-card border border-line bg-white p-4">
        <h2 className={sectionTitle}>{t("businessJobDetails.compensation")}</h2>
        <p className="text-3xl font-bold text-primary">
          {job.compensation.amount.toLocaleString(locale)} ₽
        </p>
        <p className="text-sm text-ink-secondary">{compensationType}</p>
        {job.compensation.salesBonusPercent != null && (
          <Row
            label={t("businessJobDetails.salesBonus")}
            value={t("businessJobDetails.salesBonusValue", {
              percent: job.compensation.salesBonusPercent,
            })}
          />
        )}
      </div>

      {job.description && (
        <div className="mt-4 rounded-card border border-line bg-white p-4">
          <h2 className={sectionTitle}>
            {t("businessJobDetails.description")}
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {job.description}
          </p>
        </div>
      )}

      {job.requirements && job.requirements.length > 0 && (
        <div className="mt-4 rounded-card border border-line bg-white p-4">
          <h2 className={sectionTitle}>
            {t("businessJobDetails.requirements")}
          </h2>
          {job.requirements.map((requirement) => (
            <p key={requirement} className="text-sm leading-relaxed">
              • {requirement}
            </p>
          ))}
        </div>
      )}

      {job.requiredEquipmentExperience.length > 0 && (
        <div className="mt-4 rounded-card border border-line bg-white p-4">
          <h2 className={sectionTitle}>
            {t("businessJobDetails.requiredEquipment")}
          </h2>
          {job.requiredEquipmentExperience.map((equipment) => (
            <p key={equipment} className="text-sm leading-relaxed">
              • {equipment}
            </p>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-card border border-line bg-white p-4">
        <Row
          label={t("businessJobDetails.jobType")}
          value={
            job.jobType === "temporary"
              ? t("businessJobDetails.jobTypeTemporary")
              : t("businessJobDetails.jobTypePermanent")
          }
        />
        <Row
          label={t("businessJobDetails.status")}
          value={t(`business.jobs.status.${job.status}`, {
            defaultValue: job.status,
          })}
        />
        {job.postedAt && (
          <Row
            label={t("businessJobDetails.posted")}
            value={formatDate(job.postedAt)}
          />
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-error">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2">
        {canViewApplicants && (
          <Link
            href={`/jobs/${job.id}/applicants`}
            className="rounded-card bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white"
          >
            {(job.applicationCount ?? 0) > 0
              ? t("businessJobDetails.viewApplicants", {
                  count: job.applicationCount,
                })
              : t("businessJobDetails.viewPendingOffers", {
                  count: pendingOfferCount,
                })}
          </Link>
        )}
        {canEdit && (
          <Link
            href={`/jobs/${job.id}/edit`}
            className="rounded-card border border-primary px-4 py-2.5 text-center text-sm font-semibold text-primary"
          >
            {t("job.actions.edit")}
          </Link>
        )}
        {canClose && (
          <>
            <button
              type="button"
              disabled={isUpdatingStatus}
              onClick={() => void changeStatus("filled", "markFilled")}
              className="rounded-card border border-line px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {t("job.actions.markFilled")}
            </button>
            <button
              type="button"
              disabled={isUpdatingStatus}
              onClick={() => void changeStatus("cancelled", "cancel")}
              className="rounded-card border border-error px-4 py-2.5 text-sm font-semibold text-error disabled:opacity-50"
            >
              {t("job.actions.cancel")}
            </button>
          </>
        )}
        {canReopen && (
          <button
            type="button"
            disabled={isUpdatingStatus}
            onClick={() => void changeStatus("open", "reopen")}
            className="rounded-card border border-primary px-4 py-2.5 text-sm font-semibold text-primary disabled:opacity-50"
          >
            {t("job.actions.reopen")}
          </button>
        )}
      </div>
    </div>
  );
}
