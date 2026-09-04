"use client";

import Link from "next/link";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ApplicationService,
  type CompletedShiftEntry,
} from "@bystrobarista/core/services/ApplicationService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import type { ApplicationId, UserId } from "@bystrobarista/core/types/ids";
import { isPermanentApplication } from "@bystrobarista/core/utils/employment";
import { formatDateOnly } from "@/lib/dates";
import { StarRow } from "@/components/StarRow";
import { ReviewModal } from "@/components/ReviewModal";

// Port of ShiftHistoryScreen: completed shifts with hours worked (or the
// employment period for permanent positions), both parties' reviews, and a
// "rate business" entry point.
export default function ShiftsPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const [reviewTarget, setReviewTarget] = useState<CompletedShiftEntry | null>(
    null,
  );

  const shiftsQuery = useQuery({
    queryKey: ["shifts", "completed", userId],
    queryFn: () =>
      ApplicationService.getCompletedApplicationsByBarista(userId as UserId),
    enabled: Boolean(userId),
  });

  const entries = shiftsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">{t("shiftHistory.title")}</h1>

      {shiftsQuery.isPending ? (
        Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="mb-3 h-28 animate-pulse rounded-card border border-line bg-bg-secondary"
          />
        ))
      ) : entries.length === 0 ? (
        <p className="py-16 text-center text-sm text-ink-secondary">
          {t("shiftHistory.empty")}
        </p>
      ) : (
        entries.map((entry) => {
          const permanent = isPermanentApplication(entry);
          const employment = entry.employment;
          return (
            <div
              key={entry.id}
              className="mb-3 rounded-card border border-line bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/applications/${entry.id}`}
                  className="flex-1 font-semibold hover:text-primary"
                >
                  {entry.job?.businessName ?? entry.job?.title ?? ""}
                </Link>
                <span className="shrink-0 text-sm font-semibold text-primary">
                  {permanent
                    ? t("employment.historyLabel")
                    : t("shiftHistory.hours", { hours: entry.hoursWorked })}
                </span>
              </div>
              {entry.job?.branchName && (
                <p className="text-sm text-ink-secondary">
                  {entry.job.branchName}
                  {entry.job.metroStation && ` · Ⓜ ${entry.job.metroStation}`}
                </p>
              )}
              <p className="mt-1 text-xs text-ink-secondary">
                {permanent && employment
                  ? t("employment.period", {
                      start: formatDateOnly(employment.startDate, locale),
                      end: formatDateOnly(
                        employment.endedAt ?? entry.completedAt,
                        locale,
                      ),
                    })
                  : new Date(entry.completedAt).toLocaleDateString(locale)}
              </p>

              <div className="mt-2 flex flex-col gap-1 text-sm">
                {entry.businessReview ? (
                  <StarRow rating={entry.businessReview.rating} showValue />
                ) : (
                  <span className="text-xs text-ink-secondary">
                    {t("shiftHistory.noReviewLeft")}
                  </span>
                )}
                {entry.baristaReview && (
                  <span className="flex items-center gap-1 text-xs text-ink-secondary">
                    {t("shiftHistory.yourReview")}{" "}
                    <StarRow rating={entry.baristaReview.rating} showValue />
                  </span>
                )}
              </div>

              {!entry.baristaReview && entry.job?.businessOwnerId && (
                <button
                  type="button"
                  onClick={() => setReviewTarget(entry)}
                  className="mt-3 rounded-input border border-primary px-4 py-2 text-sm font-medium text-primary"
                >
                  {t("shiftHistory.rateBusiness")}
                </button>
              )}
            </div>
          );
        })
      )}

      {reviewTarget?.job?.businessOwnerId && (
        <ReviewModal
          open
          applicationId={reviewTarget.id as ApplicationId}
          raterRole="barista"
          rateeId={reviewTarget.job.businessOwnerId as UserId}
          onSubmitted={() => {
            setReviewTarget(null);
            void queryClient.invalidateQueries({ queryKey: ["shifts"] });
          }}
          onSkip={() => setReviewTarget(null)}
        />
      )}
    </div>
  );
}
