"use client";

import Link from "next/link";
import React from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import { ApplicationService } from "@bystrobarista/core/services/ApplicationService";
import { ChatService } from "@bystrobarista/core/services/ChatService";
import { EmploymentService } from "@bystrobarista/core/services/EmploymentService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import type {
  Application,
  ApplicationStatus,
} from "@bystrobarista/core/types/application";
import type { UserId } from "@bystrobarista/core/types/ids";
import { EMPLOYMENT_BADGE } from "@/lib/employmentUi";
import { CurrentEmploymentCard } from "@/components/CurrentEmploymentCard";

const STATUS_BADGE: Record<ApplicationStatus, string> = {
  pending: "bg-[#F59E0B]",
  under_review: "bg-[#F59E0B]",
  accepted: "bg-[#10B981]",
  rejected: "bg-[#EF4444]",
  withdrawn: "bg-[#6B7280]",
  completed: "bg-[#6B7280]",
};

const statusLabel = (status: ApplicationStatus, t: TFunction): string => {
  switch (status) {
    case "pending":
      return t("applications.status.pending");
    case "under_review":
      return t("applications.status.underReview");
    case "accepted":
      return t("applications.status.accepted");
    case "rejected":
      return t("applications.status.rejected");
    case "withdrawn":
      return t("applications.status.withdrawn");
    case "completed":
      return t("applications.status.completed");
  }
};

const compensationLine = (
  application: Application,
  t: TFunction,
  locale: string,
): string | null => {
  const compensation = application.job?.compensation;
  if (!compensation) return null;
  const amount = `₽${compensation.amount.toLocaleString(locale)}`;
  switch (compensation.type) {
    case "hourly":
      return t("applications.perHour", { amount });
    case "daily":
      return t("applications.perDay", { amount });
    default:
      return amount;
  }
};

export default function ApplicationsPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
  const userId = useAuthStore((s) => s.user?.id);

  const applicationsQuery = useQuery({
    queryKey: ["applications", "byBarista", userId],
    queryFn: () =>
      ApplicationService.getApplicationsByBarista(userId as string),
    enabled: Boolean(userId),
  });

  const employmentQuery = useQuery({
    queryKey: ["employments", "activeForBarista", userId],
    queryFn: () => EmploymentService.getActiveForBarista(userId as UserId),
    enabled: Boolean(userId),
  });

  const applications = applicationsQuery.data ?? [];
  const applicationIds = applications.map((a) => a.id);

  const unreadQuery = useQuery({
    queryKey: ["chats", "unreadByApplication", applicationIds],
    queryFn: () =>
      ChatService.getUnreadCountsByApplicationIds(applicationIds, "barista"),
    enabled: applicationIds.length > 0,
  });

  const spokenQuery = useQuery({
    queryKey: ["chats", "businessHasSpoken", applicationIds],
    queryFn: () =>
      ChatService.getBusinessHasSpokenByApplicationIds(applicationIds),
    enabled: applicationIds.length > 0,
  });

  const unreadCounts = unreadQuery.data ?? {};
  const businessHasSpoken = spokenQuery.data ?? new Set<string>();

  if (applicationsQuery.isPending) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold">{t("applications.title")}</h1>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="mb-3 h-32 animate-pulse rounded-card border border-line bg-bg-secondary"
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("applications.title")}</h1>

      {employmentQuery.data && (
        <CurrentEmploymentCard employment={employmentQuery.data} />
      )}

      {applications.length === 0 ? (
        <div className="py-16 text-center">
          <p className="mb-2 text-lg font-semibold text-ink-secondary">
            {t("applications.empty")}
          </p>
          <p className="text-sm text-ink-secondary">
            {t("applications.emptyHint")}
          </p>
        </div>
      ) : (
        applications.map((application) => {
          // Mobile parity: barista may write only when the offer came from
          // the business, the application is accepted, or business wrote first.
          const canWrite =
            application.createdViaOffer ||
            application.status === "accepted" ||
            businessHasSpoken.has(application.id);
          const unread = unreadCounts[application.id] ?? 0;
          const compensation = compensationLine(application, t, locale);

          return (
            <div
              key={application.id}
              className="mb-3 rounded-card border border-line bg-white p-4"
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <Link
                  href={`/applications/${application.id}`}
                  className="flex-1 font-semibold hover:text-primary"
                >
                  {application.job?.title ?? t("applications.fallbackJob")}
                </Link>
                <span
                  className={`shrink-0 rounded-chip px-2 py-1 text-xs font-semibold text-white ${
                    application.employment
                      ? EMPLOYMENT_BADGE[application.employment.status]
                      : STATUS_BADGE[application.status]
                  }`}
                >
                  {application.employment
                    ? t(
                        `employment.stageShort.${application.employment.status}`,
                      )
                    : statusLabel(application.status, t)}
                </span>
              </div>

              <p className="text-sm text-ink-secondary">
                {application.job?.businessName ??
                  t("applications.fallbackBusiness")}
                {application.job?.branchName &&
                  ` • ${application.job.branchName}`}
              </p>

              {compensation && (
                <p className="mt-1 text-sm font-semibold text-primary">
                  {compensation}
                </p>
              )}

              <p className="mt-1 text-xs text-ink-secondary">
                {t("applications.appliedShort", {
                  date: new Date(application.createdAt).toLocaleDateString(
                    locale,
                  ),
                })}
              </p>

              <div className="mt-3">
                {canWrite ? (
                  <Link
                    href={`/chats?applicationId=${application.id}`}
                    className="relative inline-block rounded-input border border-primary px-4 py-2 text-sm font-medium text-primary"
                  >
                    {t("applications.messageBusiness")}
                    {unread > 0 && (
                      <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1 text-xs font-bold text-white">
                        {unread}
                      </span>
                    )}
                  </Link>
                ) : (
                  <p className="text-xs text-ink-secondary">
                    {t("applications.waitForBusinessFirst")}
                  </p>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
