"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ReportService } from "@bystrobarista/core/services/ReportService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import type { UserReport } from "@bystrobarista/core/types/userReport";
import { formatDateOnly } from "@/lib/dates";

const OUTCOME_BADGE: Record<NonNullable<UserReport["outcome"]>, string> = {
  no_violation: "bg-ink-secondary",
  warning: "bg-warning",
  suspension: "bg-success",
  ban: "bg-success",
};

// The reporter's own abuse reports with the moderation outcome and reply.
export default function MyReportsPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
  const userId = useAuthStore((s) => s.user?.id);
  const reportsQuery = useQuery({
    queryKey: ["myReports", userId],
    queryFn: () => ReportService.listMyReports(),
    enabled: Boolean(userId),
  });
  const reports = reportsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">{t("myReports.title")}</h1>
      {reportsQuery.isPending && (
        <div className="h-32 animate-pulse rounded-card bg-bg-secondary" />
      )}
      {reportsQuery.isSuccess && reports.length === 0 && (
        <p className="py-12 text-center text-sm text-ink-secondary">
          {t("myReports.empty")}
        </p>
      )}
      {reports.map((report) => {
        const closed =
          report.status === "resolved" || report.status === "dismissed";
        return (
          <div
            key={report.id}
            className="mb-2 rounded-card border border-line bg-white p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {t(`report.reason.${report.reasonCode}`)}{" "}
                  <span className="font-normal text-ink-secondary">
                    {t(`myReports.target.${report.targetType}`)}
                  </span>
                </p>
                <p className="mt-0.5 text-[11px] text-ink-secondary">
                  {formatDateOnly(report.createdAt, locale, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-chip px-2 py-1 text-xs font-semibold text-white ${
                  closed && report.outcome
                    ? OUTCOME_BADGE[report.outcome]
                    : "bg-warning"
                }`}
              >
                {closed && report.outcome
                  ? t(`myReports.outcome.${report.outcome}`)
                  : t("myReports.pending")}
              </span>
            </div>
            {report.details && (
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink-secondary">
                {report.details}
              </p>
            )}
            {report.resolutionNote && (
              <div className="mt-2 rounded-input bg-bg-secondary px-3 py-2 text-sm">
                <p className="text-xs font-medium text-ink-secondary">
                  {t("myReports.reply")}
                </p>
                <p className="whitespace-pre-wrap">{report.resolutionNote}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
