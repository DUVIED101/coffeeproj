"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import { JobService } from "@bystrobarista/core/services/JobService";
import { ApplicationService } from "@bystrobarista/core/services/ApplicationService";
import { JobOfferService } from "@bystrobarista/core/services/JobOfferService";
import { ChatService } from "@bystrobarista/core/services/ChatService";
import { ReviewService } from "@bystrobarista/core/services/ReviewService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import type {
  Application,
  DisputeSummary,
} from "@bystrobarista/core/types/application";
import type {
  ApplicationId,
  JobId,
  JobOfferId,
  UserId,
} from "@bystrobarista/core/types/ids";
import {
  getShiftEnd,
  getShiftStart,
} from "@bystrobarista/core/utils/shiftLifecycle";
import { transformedImageUrl } from "@/lib/imageTransform";
import { ReviewModal } from "@/components/ReviewModal";

const CANCEL_WINDOW_MS = 60 * 60 * 1000;

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-[#F59E0B]",
  under_review: "bg-[#F59E0B]",
  accepted: "bg-[#10B981]",
  rejected: "bg-[#EF4444]",
  withdrawn: "bg-[#6B7280]",
  completed: "bg-[#6B7280]",
};

const statusLabel = (status: string, t: TFunction): string => {
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
    default:
      return status;
  }
};

const displayName = (app: Application, t: TFunction): string => {
  const profile = app.baristaProfile;
  const name = [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || app.baristaEmail || t("applicants.noEmail");
};

// Web port of mobile's ApplicantsScreen: pending offers on top, then the
// application cards with accept/reject, chat, profile link, completion
// confirmation gated by shift end, cancel-shift within the 60-minute window,
// review prompt after completion and read-only dispute status. Filing a new
// dispute is Phase 5 (shared DisputeForm).
export default function ApplicantsPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const queryClient = useQueryClient();

  const jobQuery = useQuery({
    queryKey: ["jobs", "byId", jobId],
    queryFn: () => JobService.getJobById(jobId),
  });

  // Owner-only surface: RLS already hides the data from everyone else, but
  // a barista or another business landing here should get the job page,
  // not an empty list.
  useEffect(() => {
    if (!user) return;
    const ownerId = jobQuery.data?.businessOwnerId;
    if (user.accountType !== "business" || (ownerId && ownerId !== user.id)) {
      router.replace(`/jobs/${jobId}`);
    }
  }, [user, router, jobId, jobQuery.data?.businessOwnerId]);

  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [cancellingOfferIds, setCancellingOfferIds] = useState<Set<string>>(
    new Set(),
  );
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [reviewTarget, setReviewTarget] = useState<{
    applicationId: ApplicationId;
    rateeId: UserId;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  const applicationsQuery = useQuery({
    queryKey: ["applications", "byJob", jobId],
    queryFn: () => ApplicationService.getApplicationsByJob(jobId),
  });
  const applications = useMemo(
    () => applicationsQuery.data ?? [],
    [applicationsQuery.data],
  );

  const offersQuery = useQuery({
    queryKey: ["offers", "pendingForJob", jobId],
    queryFn: () =>
      JobOfferService.getPendingOffersForJob(jobId as JobId).catch(() => []),
  });
  const pendingOffers = offersQuery.data ?? [];

  const applicationIds = useMemo(
    () => applications.map((a) => a.id),
    [applications],
  );

  const unreadQuery = useQuery({
    queryKey: ["chats", "unreadByApplication", applicationIds],
    queryFn: () =>
      ChatService.getUnreadCountsByApplicationIds(
        applicationIds,
        "business",
      ).catch(() => ({}) as Record<string, number>),
    enabled: applicationIds.length > 0,
  });
  const unreadCounts = unreadQuery.data ?? {};

  const completedIds = useMemo(
    () => applications.filter((a) => a.status === "completed").map((a) => a.id),
    [applications],
  );

  const reviewsQuery = useQuery({
    queryKey: ["reviews", "byApplications", "business", completedIds],
    queryFn: async () => {
      const reviews = await ReviewService.getReviewsByApplications(
        completedIds as ApplicationId[],
        "business",
      ).catch(() => new Map());
      return Object.fromEntries(
        completedIds.map((id) => [id, reviews.has(id as ApplicationId)]),
      ) as Record<string, boolean>;
    },
    enabled: completedIds.length > 0,
  });
  const reviewedByApplication = reviewsQuery.data ?? {};

  const disputesQuery = useQuery({
    queryKey: ["disputes", "own", applicationIds],
    queryFn: () =>
      ApplicationService.getOwnDisputeMap(
        applicationIds as ApplicationId[],
      ).catch(() => ({}) as Record<string, DisputeSummary>),
    enabled: applicationIds.length > 0,
  });
  const disputeMap = disputesQuery.data ?? {};

  const shift = jobQuery.data?.shiftDetails;
  const shiftEnd = shift ? getShiftEnd(shift) : null;
  const shiftStart = shift ? getShiftStart(shift) : null;
  const shiftEndReached = shiftEnd ? now >= shiftEnd : false;
  const cancelWindowOpen = shiftStart
    ? now.getTime() < shiftStart.getTime() + CANCEL_WINDOW_MS
    : true;

  // Re-render exactly when the shift-end / cancel-window boundary passes.
  useEffect(() => {
    const boundaries = [
      shiftEnd?.getTime(),
      shiftStart ? shiftStart.getTime() + CANCEL_WINDOW_MS : undefined,
    ].filter((ts): ts is number => ts != null && ts > now.getTime());
    if (boundaries.length === 0) return;
    const timer = setTimeout(
      () => setNow(new Date()),
      Math.min(...boundaries) - now.getTime() + 1000,
    );
    return () => clearTimeout(timer);
  }, [shiftEnd, shiftStart, now]);

  const markProcessing = (id: string, value: boolean): void =>
    setProcessingIds((prev) => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });

  const reload = (): Promise<void> =>
    queryClient
      .invalidateQueries({ queryKey: ["applications", "byJob", jobId] })
      .then(() =>
        queryClient.invalidateQueries({ queryKey: ["jobs", "byId", jobId] }),
      );

  const changeStatus = async (
    applicationId: string,
    status: "accepted" | "rejected",
    failureKey: string,
  ): Promise<void> => {
    if (!userId) return;
    markProcessing(applicationId, true);
    setError(null);
    try {
      await ApplicationService.updateApplicationStatus(
        applicationId,
        status,
        userId,
      );
      await reload();
    } catch {
      setError(t(failureKey));
    } finally {
      markProcessing(applicationId, false);
    }
  };

  const handleCancelShift = (applicationId: string): void => {
    if (!window.confirm(t("applications.cancelShift.confirmBody"))) return;
    void changeStatus(
      applicationId,
      "rejected",
      "applications.cancelShift.failure",
    );
  };

  const handleConfirmCompletion = async (app: Application): Promise<void> => {
    if (!userId) return;
    markProcessing(app.id, true);
    setError(null);
    try {
      await ApplicationService.markCompletedByBusiness(app.id, userId);
      await reload();
      const alreadyReviewed = await ReviewService.getReviewByApplication(
        app.id as ApplicationId,
        "business",
      ).catch(() => null);
      if (!alreadyReviewed && !reviewedIds.has(app.id)) {
        setReviewTarget({
          applicationId: app.id as ApplicationId,
          rateeId: app.baristaId as UserId,
        });
      }
    } catch {
      setError(t("applicants.confirmCompletionFailure"));
    } finally {
      markProcessing(app.id, false);
    }
  };

  const handleCancelOffer = async (offerId: string): Promise<void> => {
    if (!window.confirm(t("applicants.cancelOfferConfirmBody"))) return;
    setCancellingOfferIds((prev) => new Set(prev).add(offerId));
    setError(null);
    try {
      await JobOfferService.cancelOffer(offerId as JobOfferId);
      await queryClient.invalidateQueries({
        queryKey: ["offers", "pendingForJob", jobId],
      });
    } catch {
      setError(t("applicants.cancelOfferFailure"));
    } finally {
      setCancellingOfferIds((prev) => {
        const next = new Set(prev);
        next.delete(offerId);
        return next;
      });
    }
  };

  const isLoading = applicationsQuery.isPending || jobQuery.isPending;

  const shiftEndLabel = shiftEnd
    ? shiftEnd.toLocaleString(locale, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <h1 className="text-2xl font-bold">{t("applicants.title")}</h1>
      <p className="mb-4 mt-1 text-sm text-ink-secondary">
        {t("applicants.totalCount", { count: applications.length })}
      </p>

      {error && (
        <p role="alert" className="mb-3 text-sm text-error">
          {error}
        </p>
      )}

      {pendingOffers.length > 0 && (
        <div className="mb-4 rounded-card border border-line bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold">
            {t("applicants.pendingOffersSection", {
              count: pendingOffers.length,
            })}
          </h2>
          {pendingOffers.map((offer) => {
            const name =
              [offer.baristaFirstName, offer.baristaLastName]
                .filter(Boolean)
                .join(" ")
                .trim() || t("applicants.unknownBarista");
            return (
              <div
                key={offer.id}
                className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0"
              >
                <Link
                  href={`/baristas/${offer.baristaId}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  {offer.baristaAvatarUrl ? (
                    <img
                      src={transformedImageUrl(offer.baristaAvatarUrl, 72)}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                      {name[0]}
                    </div>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {name}
                    </span>
                    <span className="block text-xs text-ink-secondary">
                      {t("applicants.offerSentOn", {
                        date: new Date(offer.createdAt).toLocaleDateString(
                          locale,
                        ),
                      })}
                    </span>
                  </span>
                </Link>
                <button
                  type="button"
                  disabled={cancellingOfferIds.has(offer.id)}
                  onClick={() => void handleCancelOffer(offer.id)}
                  className="shrink-0 rounded-input border border-error px-3 py-1.5 text-sm font-medium text-error disabled:opacity-50"
                >
                  {t("applicants.cancelOffer")}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {isLoading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="mb-3 h-40 animate-pulse rounded-card border border-line bg-bg-secondary"
          />
        ))
      ) : applications.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-semibold text-ink-secondary">
            {t("applicants.empty")}
          </p>
          <p className="mt-1 text-sm text-ink-secondary">
            {t("applicants.emptySubtitle")}
          </p>
        </div>
      ) : (
        applications.map((app) => {
          const processing = processingIds.has(app.id);
          const unread = unreadCounts[app.id] ?? 0;
          const dispute = disputeMap[app.id];
          const reviewed =
            reviewedIds.has(app.id) || reviewedByApplication[app.id];
          return (
            <div
              key={app.id}
              className="mb-3 rounded-card border border-line bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  {app.baristaProfile?.avatarUrl ? (
                    <img
                      src={transformedImageUrl(
                        app.baristaProfile.avatarUrl,
                        96,
                      )}
                      alt=""
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                      {displayName(app, t)[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {displayName(app, t)}
                    </p>
                    {app.baristaProfile?.yearsOfExperience != null && (
                      <p className="text-xs text-ink-secondary">
                        {t("applicants.experienceYears", {
                          count: app.baristaProfile.yearsOfExperience,
                        })}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-chip px-2 py-1 text-xs font-semibold text-white ${STATUS_BADGE[app.status] ?? "bg-ink-secondary"}`}
                >
                  {statusLabel(app.status, t)}
                </span>
              </div>

              {app.coverLetter && (
                <div className="mt-3 rounded-input bg-bg-secondary p-3">
                  <p className="text-xs font-medium text-ink-secondary">
                    {t("applicants.coverLetterLabel")}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {app.coverLetter}
                  </p>
                </div>
              )}

              <p className="mt-2 text-xs text-ink-secondary">
                {t("applicants.appliedOn", {
                  date: new Date(app.createdAt).toLocaleDateString(locale),
                })}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/baristas/${app.baristaId}`}
                  className="rounded-input border border-line px-3 py-1.5 text-sm font-medium"
                >
                  {t("applicants.viewProfile")}
                </Link>
                <Link
                  href={`/chats?applicationId=${app.id}`}
                  className="relative rounded-input border border-line px-3 py-1.5 text-sm font-medium"
                >
                  {t("applicants.chat")}
                  {unread > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1 text-xs font-bold text-white">
                      {unread}
                    </span>
                  )}
                </Link>
              </div>

              {(app.status === "pending" || app.status === "under_review") && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() =>
                      void changeStatus(
                        app.id,
                        "accepted",
                        "applicants.acceptFailure",
                      )
                    }
                    className="flex-1 rounded-card bg-success px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {t("applicants.accept")}
                  </button>
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() =>
                      void changeStatus(
                        app.id,
                        "rejected",
                        "applicants.rejectFailure",
                      )
                    }
                    className="flex-1 rounded-card border border-error px-4 py-2.5 text-sm font-semibold text-error disabled:opacity-50"
                  >
                    {t("applicants.reject")}
                  </button>
                </div>
              )}

              {app.status === "accepted" && !app.completedByBusiness && (
                <div className="mt-3">
                  <button
                    type="button"
                    disabled={processing || !shiftEndReached}
                    onClick={() => void handleConfirmCompletion(app)}
                    className="w-full rounded-card bg-success px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {t("applicants.confirmCompletion")}
                  </button>
                  {!shiftEndReached && shiftEndLabel && (
                    <p className="mt-1 text-center text-xs text-ink-secondary">
                      {t("applications.details.availableAfter", {
                        time: shiftEndLabel,
                      })}
                    </p>
                  )}
                </div>
              )}

              {app.status === "accepted" && cancelWindowOpen && (
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => handleCancelShift(app.id)}
                  className="mt-2 w-full rounded-card border border-error px-4 py-2.5 text-sm font-semibold text-error disabled:opacity-50"
                >
                  {t("applications.cancelShift.action")}
                </button>
              )}

              {app.status === "completed" && !reviewed && (
                <button
                  type="button"
                  onClick={() =>
                    setReviewTarget({
                      applicationId: app.id as ApplicationId,
                      rateeId: app.baristaId as UserId,
                    })
                  }
                  className="mt-3 w-full rounded-card border border-[#FCD34D] bg-[#FEF3C7] px-4 py-2.5 text-sm font-medium text-[#92400E]"
                >
                  {t("reviews.banner.prompt")}
                </button>
              )}

              {dispute && (
                <p className="mt-3 rounded-input bg-bg-secondary p-3 text-xs text-ink-secondary">
                  {t("disputes.filedLabel")} ·{" "}
                  {t(`disputes.status.${dispute.status}`)}
                </p>
              )}
            </div>
          );
        })
      )}

      {(() => {
        // Countdown banner (mobile's ShiftCountdownBanner): accepted barista
        // hasn't started the shift yet → entry point to the no-response flow.
        const acceptedApp = applications.find((a) => a.status === "accepted");
        if (!acceptedApp || !shiftStart || shiftStart <= now) return null;
        const jobTitle = jobQuery.data?.title ?? "";
        const query = new URLSearchParams({
          applicationId: acceptedApp.id,
          jobTitle,
          shiftStart: shiftStart.toISOString(),
        });
        const totalMinutes = Math.floor(
          (shiftStart.getTime() - now.getTime()) / 60_000,
        );
        const days = Math.floor(totalMinutes / (60 * 24));
        const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
        const minutes = totalMinutes % 60;
        const countdown =
          days > 0
            ? t("shiftCountdown.daysHours", { days, hours })
            : hours > 0
              ? t("shiftCountdown.hoursMinutes", { hours, minutes })
              : t("shiftCountdown.minutes", { minutes });
        return (
          <Link
            href={`/shift-alerts?${query.toString()}`}
            className="mt-2 block rounded-card border border-[#FCD34D] bg-[#FEF3C7] px-4 py-3 text-sm font-medium text-[#92400E]"
          >
            {jobTitle} · {countdown}
          </Link>
        );
      })()}

      {reviewTarget && (
        <ReviewModal
          open
          applicationId={reviewTarget.applicationId}
          raterRole="business"
          rateeId={reviewTarget.rateeId}
          onSubmitted={(review) => {
            setReviewedIds((prev) => new Set(prev).add(review.applicationId));
            setReviewTarget(null);
          }}
          onSkip={() => setReviewTarget(null)}
        />
      )}
    </div>
  );
}
