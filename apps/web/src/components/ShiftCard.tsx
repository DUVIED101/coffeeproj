"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import React from "react";
import { useTranslation } from "react-i18next";
import type { Job } from "@bystrobarista/core/types/job";
import type { Application } from "@bystrobarista/core/types/application";
import type { ShiftLifecycleStatus } from "@bystrobarista/core/types/application";
import { transformedImageUrl } from "@/lib/imageTransform";

export type ShiftEntry = {
  job: Job;
  applications: Application[];
  lifecycle: ShiftLifecycleStatus;
};

const LIFECYCLE_CLASSES: Record<ShiftLifecycleStatus, string> = {
  open: "bg-success",
  under_review: "bg-warning",
  accepted: "bg-primary",
  in_progress: "bg-[#3498DB]",
  completed: "bg-ink-secondary",
};

const MAX_PENDING_AVATARS = 3;

const formatShiftDate = (date: string, locale: string): string => {
  const dateObj = new Date(date);
  return `${dateObj.getDate()} ${dateObj.toLocaleString(locale, { month: "short" })}`;
};

const initials = (profile: Application["baristaProfile"] | undefined): string =>
  `${profile?.firstName?.[0] ?? ""}${profile?.lastName?.[0] ?? ""}` || "•";

// Web port of mobile's ShiftCard: title + date row, metro/branch line,
// lifecycle pill, then either the accepted barista (with chat entry), the
// pending-applicants avatar stack, or a "no applicants" hint. The whole card
// links to the job's applicants list, matching mobile.
export function ShiftCard({ entry }: { entry: ShiftEntry }): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
  const { job, applications, lifecycle } = entry;

  const acceptedApp = applications.find(
    (a) => a.status === "accepted" || a.status === "completed",
  );
  const pendingApps = applications.filter(
    (a) => a.status === "pending" || a.status === "under_review",
  );

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
          ? `${job.shiftDetails.scheduleStartTime}–${job.shiftDetails.scheduleEndTime}`
          : ""
      : `${job.shiftDetails.startTime}–${job.shiftDetails.endTime}`;
  const placeLabel = job.metroStation ?? job.branchName ?? "";

  return (
    <Link
      href={`/jobs/${job.id}/applicants`}
      className="mb-3 block rounded-card border border-line bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">{job.title}</h3>
          <p className="text-sm text-ink-secondary">
            {shiftDate}
            {shiftSubtitle && ` · ${shiftSubtitle}`}
          </p>
          {placeLabel && (
            <p className="text-sm text-ink-secondary">
              {job.metroStation && (
                <span aria-hidden="true" className="mr-1 text-primary">
                  Ⓜ
                </span>
              )}
              {placeLabel}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-chip px-2 py-1 text-xs font-semibold uppercase text-white ${LIFECYCLE_CLASSES[lifecycle]}`}
        >
          {t(`shifts.status.${lifecycle}`)}
        </span>
      </div>

      <div className="mt-3 border-t border-line pt-3">
        {acceptedApp ? (
          <div className="flex items-center gap-3">
            {acceptedApp.baristaProfile?.avatarUrl ? (
              <img
                src={transformedImageUrl(
                  acceptedApp.baristaProfile.avatarUrl,
                  88,
                )}
                alt=""
                className="h-11 w-11 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                {initials(acceptedApp.baristaProfile)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {acceptedApp.baristaProfile
                  ? `${acceptedApp.baristaProfile.firstName} ${acceptedApp.baristaProfile.lastName}`
                  : t("shifts.unknownBarista")}
              </p>
              <p className="text-xs text-ink-secondary">
                {t("shifts.acceptedBarista")}
              </p>
            </div>
            <span className="rounded-input border border-primary px-3 py-1.5 text-sm font-medium text-primary">
              {t("shifts.chat")}
            </span>
          </div>
        ) : pendingApps.length > 0 ? (
          <div className="flex items-center gap-3">
            <div className="flex">
              {pendingApps.slice(0, MAX_PENDING_AVATARS).map((app, i) => (
                <div
                  key={app.id}
                  className={i > 0 ? "-ml-2.5" : ""}
                  style={{ zIndex: MAX_PENDING_AVATARS - i }}
                >
                  {app.baristaProfile?.avatarUrl ? (
                    <img
                      src={transformedImageUrl(
                        app.baristaProfile.avatarUrl,
                        64,
                      )}
                      alt=""
                      className="h-8 w-8 rounded-full border-2 border-white object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary text-xs font-bold text-white">
                      {initials(app.baristaProfile)}
                    </div>
                  )}
                </div>
              ))}
              {pendingApps.length > MAX_PENDING_AVATARS && (
                <div className="-ml-2.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-bg-secondary text-xs font-semibold">
                  +{pendingApps.length - MAX_PENDING_AVATARS}
                </div>
              )}
            </div>
            <p className="text-sm">
              {t("shifts.pendingCount", { count: pendingApps.length })}
            </p>
          </div>
        ) : (
          <p className="text-sm text-ink-secondary">
            {t("shifts.noApplicantsYet")}
          </p>
        )}
      </div>
    </Link>
  );
}
