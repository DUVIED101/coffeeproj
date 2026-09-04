"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import React from "react";
import { useTranslation } from "react-i18next";
import type {
  Employment,
  EmploymentEndReason,
} from "@bystrobarista/core/types/employment";
import { transformedImageUrl } from "@/lib/imageTransform";
import { EMPLOYMENT_BADGE } from "@/lib/employmentUi";
import { EmploymentStagePanel } from "./EmploymentStagePanel";

type Props = {
  employment: Employment;
  busy: boolean;
  onConfirmStart: () => void;
  onRequestEnd: (initialReason?: EmploymentEndReason) => void;
  onConfirmEnd: () => void;
  onCancelEndRequest: () => void;
};

// Business-side hire card for the dashboard's staff tab.
export function EmploymentCard({
  employment,
  busy,
  onConfirmStart,
  onRequestEnd,
  onConfirmEnd,
  onCancelEndRequest,
}: Props): React.JSX.Element {
  const { t } = useTranslation();
  const profile = employment.baristaProfile;
  const name =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() ||
    t("applicants.unknownBarista");
  const job = employment.job;
  const place = [
    job?.branchName,
    job?.metroStation ? `Ⓜ ${job.metroStation}` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mb-3 rounded-card border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/baristas/${employment.baristaId}`}
          className="flex min-w-0 items-center gap-3"
        >
          {profile?.avatarUrl ? (
            <img
              src={transformedImageUrl(profile.avatarUrl, 96)}
              alt=""
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
              {name[0]}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold">{name}</p>
            {job && <p className="truncate text-sm">{job.title}</p>}
            {place && <p className="text-xs text-ink-secondary">{place}</p>}
          </div>
        </Link>
        <span
          className={`shrink-0 rounded-chip px-2 py-1 text-xs font-semibold text-white ${EMPLOYMENT_BADGE[employment.status]}`}
        >
          {t(`employment.stageShort.${employment.status}`)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={`/chats?applicationId=${employment.applicationId}`}
          className="rounded-input border border-line px-3 py-1.5 text-sm font-medium"
        >
          {t("applicants.chat")}
        </Link>
        <Link
          href={`/jobs/${employment.jobId}/applicants`}
          className="rounded-input border border-line px-3 py-1.5 text-sm font-medium"
        >
          {t("employment.staff.openApplicants")}
        </Link>
      </div>

      <EmploymentStagePanel
        employment={employment}
        side="business"
        busy={busy}
        onConfirmStart={onConfirmStart}
        onRequestEnd={onRequestEnd}
        onConfirmEnd={onConfirmEnd}
        onCancelEndRequest={onCancelEndRequest}
      />
    </div>
  );
}
