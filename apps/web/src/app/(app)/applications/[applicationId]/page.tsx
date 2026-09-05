"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import { ApplicationService } from "@bystrobarista/core/services/ApplicationService";
import { ReviewService } from "@bystrobarista/core/services/ReviewService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import { isPermanentApplication } from "@bystrobarista/core/utils/employment";
import { getShiftEnd } from "@bystrobarista/core/utils/shiftLifecycle";
import type { ApplicationId, UserId } from "@bystrobarista/core/types/ids";
import type { ApplicationStatus } from "@bystrobarista/core/types/application";
import { formatDateOnly } from "@/lib/dates";
import { EMPLOYMENT_BADGE } from "@/lib/employmentUi";
import { useEmploymentActions } from "@/hooks/useEmploymentActions";
import { EmploymentStagePanel } from "@/components/EmploymentStagePanel";
import { EndEmploymentModal } from "@/components/EndEmploymentModal";
import { ReviewModal } from "@/components/ReviewModal";

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

// Port of ApplicationDetailsScreen (barista side): status, job summary,
// cover letter, completion banners, withdraw / mark-complete / review /
// dispute actions. Permanent hires get the employment section instead of
// the shift completion controls.
export default function ApplicationDetailsPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams<{ applicationId: string }>();
  const applicationId = params.applicationId as ApplicationId;
  const userId = useAuthStore((s) => s.user?.id);

  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const employmentActions = useEmploymentActions();

  const applicationQuery = useQuery({
    queryKey: ["applications", "byId", applicationId],
    queryFn: () => ApplicationService.getApplicationById(applicationId),
  });
  const application = applicationQuery.data;

  const reviewQuery = useQuery({
    queryKey: ["reviews", "byApplication", applicationId, "barista"],
    queryFn: () =>
      ReviewService.getReviewByApplication(applicationId, "barista"),
    enabled: application?.status === "completed",
  });

  const disputeQuery = useQuery({
    queryKey: ["disputes", "own", applicationId],
    queryFn: () => ApplicationService.getOwnDispute(applicationId),
    enabled:
      application?.status === "accepted" || application?.status === "completed",
  });

  if (applicationQuery.isPending) {
    return (
      <div className="mx-auto h-72 max-w-2xl animate-pulse rounded-card bg-bg-secondary" />
    );
  }

  if (!application) {
    return (
      <p className="py-16 text-center text-ink-secondary">
        {t("applications.fallbackJob")}
      </p>
    );
  }

  const job = application.job;
  const employment = application.employment;
  const isPermanent = isPermanentApplication(application);
  const shiftEnd =
    !isPermanent && job?.shiftDetails ? getShiftEnd(job.shiftDetails) : null;
  const shiftEndReached = shiftEnd ? Date.now() >= shiftEnd.getTime() : false;
  const canWithdraw =
    application.status === "pending" || application.status === "under_review";
  const canMarkComplete =
    !isPermanent &&
    application.status === "accepted" &&
    !application.completedByBarista;

  const refresh = (): void => {
    void queryClient.invalidateQueries({ queryKey: ["applications"] });
  };

  const handleWithdraw = async (): Promise<void> => {
    const ok = window.confirm(
      `${t("applications.details.withdrawConfirmTitle")}\n\n${t("applications.details.withdrawConfirmBody")}`,
    );
    if (!ok) return;
    setActing(true);
    setActionError(null);
    try {
      await ApplicationService.withdrawApplication(applicationId);
      refresh();
      router.push("/applications");
    } catch {
      setActionError(t("applications.details.withdrawFailure"));
      setActing(false);
    }
  };

  const handleMarkComplete = async (): Promise<void> => {
    setActing(true);
    setActionError(null);
    try {
      await ApplicationService.markCompletedByBarista(applicationId);
      refresh();
      await applicationQuery.refetch();
      setActing(false);
    } catch {
      setActionError(t("applications.details.markCompleteFailure"));
      setActing(false);
    }
  };

  const handleConfirmEnd = async (): Promise<void> => {
    const ended = await employmentActions.confirmEnd(applicationId);
    if (!ended) return;
    if (await employmentActions.isAlreadyReviewed(applicationId, "barista")) {
      return;
    }
    setReviewOpen(true);
  };

  const compensation = job?.compensation;
  const compensationText = compensation
    ? `${compensation.amount.toLocaleString(locale)} ₽ · ${t(
        compensation.type === "hourly"
          ? "applications.details.perHour"
          : compensation.type === "daily"
            ? "applications.details.perDay"
            : "applications.details.fixed",
      )}`
    : null;

  return (
    <div className="mx-auto max-w-2xl pb-10">
      <div className="flex flex-col items-center">
        <span
          className={`rounded-full px-4 py-1.5 text-sm font-semibold text-white ${
            employment
              ? EMPLOYMENT_BADGE[employment.status]
              : STATUS_BADGE[application.status]
          }`}
        >
          {employment
            ? t(`employment.stageShort.${employment.status}`)
            : statusLabel(application.status, t)}
        </span>
        <p className="mt-2 text-xs text-ink-secondary">
          {t("applications.details.appliedOn", {
            date: new Date(application.createdAt).toLocaleDateString(locale),
          })}
        </p>
      </div>

      {job && (
        <section className="mt-6 rounded-card border border-line bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold text-ink-secondary">
            {t("applications.details.jobDetails")}
          </h2>
          <Link
            href={`/jobs/${application.jobId}`}
            className="font-semibold hover:text-primary"
          >
            {job.title}
          </Link>
          {job.businessOwnerId ? (
            <Link
              href={`/businesses/${job.businessOwnerId}`}
              className="block text-sm text-primary"
            >
              {job.businessName}
            </Link>
          ) : (
            <p className="text-sm text-ink-secondary">{job.businessName}</p>
          )}
          {job.branchName && (
            <p className="text-sm text-ink-secondary">{job.branchName}</p>
          )}
          {compensationText && (
            <p className="mt-1 text-sm font-semibold text-primary">
              {compensationText}
            </p>
          )}
          {job.location?.address && (
            <p className="mt-1 text-sm text-ink-secondary">
              {job.location.address}
            </p>
          )}
          {job.metroStation && (
            <p className="text-sm text-ink-secondary">
              {t("applications.details.metroPrefix", {
                station: job.metroStation,
              })}
            </p>
          )}
        </section>
      )}

      {application.coverLetter && (
        <section className="mt-4 rounded-card border border-line bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold text-ink-secondary">
            {t("applications.details.yourCoverLetter")}
          </h2>
          <p className="whitespace-pre-line text-sm">
            {application.coverLetter}
          </p>
        </section>
      )}

      {employment && (
        <section className="mt-4 rounded-card border border-line bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold text-ink-secondary">
            {t("employment.sectionTitle")}
          </h2>
          <p className="text-sm">
            {t("employment.startDate", {
              date: formatDateOnly(employment.startDate, locale),
            })}
          </p>
          <EmploymentStagePanel
            employment={employment}
            side="barista"
            busy={acting || employmentActions.isBusy(applicationId)}
            onConfirmStart={() =>
              void employmentActions.confirmStart(applicationId)
            }
            onRequestEnd={() => setEndOpen(true)}
            onConfirmEnd={() => void handleConfirmEnd()}
            onCancelEndRequest={() =>
              void employmentActions.cancelEndRequest(applicationId)
            }
          />
        </section>
      )}

      {!isPermanent &&
        (application.status === "accepted" ||
          application.status === "completed") && (
          <div
            className={`mt-4 rounded-card px-4 py-3 text-sm ${
              application.completedByBarista && application.completedByBusiness
                ? "bg-[#D1FAE5] text-[#065F46]"
                : application.completedByBarista
                  ? "bg-[#FEF3C7] text-[#92400E]"
                  : "hidden"
            }`}
          >
            {application.completedByBarista && application.completedByBusiness
              ? t("applications.details.completedBoth")
              : t("applications.details.completedAwaitingBusiness")}
          </div>
        )}

      {actionError && (
        <p role="alert" className="mt-4 text-sm text-error">
          {actionError}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2">
        {canMarkComplete && (
          <>
            <button
              type="button"
              onClick={() => void handleMarkComplete()}
              disabled={acting || !shiftEndReached}
              className="rounded-card bg-success px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {t("applications.details.markCompleteAction")}
            </button>
            {!shiftEndReached && shiftEnd && (
              <p className="text-center text-xs text-ink-secondary">
                {t("applications.details.availableAfter", {
                  time: shiftEnd.toLocaleString(locale, {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                })}
              </p>
            )}
          </>
        )}

        {canWithdraw && (
          <button
            type="button"
            onClick={() => void handleWithdraw()}
            disabled={acting}
            className="rounded-card border border-error px-4 py-3 text-sm font-semibold text-error disabled:opacity-50"
          >
            {t("applications.details.withdrawAction")}
          </button>
        )}

        {application.status === "completed" &&
          reviewQuery.isSuccess &&
          !reviewQuery.data &&
          job?.businessOwnerId && (
            <button
              type="button"
              onClick={() => setReviewOpen(true)}
              className="rounded-card border border-[#FCD34D] bg-[#FEF3C7] px-4 py-3 text-sm font-semibold text-[#92400E]"
            >
              {t("reviews.banner.prompt")}
            </button>
          )}

        {(application.status === "accepted" ||
          application.status === "completed") &&
          disputeQuery.isSuccess &&
          (disputeQuery.data ? (
            <Link
              href={`/disputes/${disputeQuery.data.id}`}
              className="rounded-card border border-line bg-bg-secondary px-4 py-3 text-center text-sm"
            >
              <span className="font-semibold">{t("disputes.filedLabel")}</span>
              {" · "}
              {t(`disputes.status.${disputeQuery.data.status}`)}
              {disputeQuery.data.resolutionNote && (
                <span className="mt-1 block text-xs text-ink-secondary">
                  {disputeQuery.data.resolutionNote}
                </span>
              )}
            </Link>
          ) : (
            <Link
              href={`/disputes/new?applicationId=${applicationId}`}
              className="rounded-card border border-error px-4 py-3 text-center text-sm font-semibold text-error"
            >
              {t("disputes.openAction")}
            </Link>
          ))}
      </div>

      {endOpen && (
        <EndEmploymentModal
          open
          side="barista"
          onSubmit={async (reason, comment) => {
            await employmentActions.requestEnd({
              applicationId,
              reason,
              comment,
            });
            setEndOpen(false);
          }}
          onClose={() => setEndOpen(false)}
        />
      )}

      {reviewOpen && job?.businessOwnerId && (
        <ReviewModal
          open
          applicationId={applicationId}
          raterRole="barista"
          rateeId={job.businessOwnerId as UserId}
          onSubmitted={() => {
            setReviewOpen(false);
            void queryClient.invalidateQueries({ queryKey: ["reviews"] });
          }}
          onSkip={() => setReviewOpen(false)}
        />
      )}
    </div>
  );
}
