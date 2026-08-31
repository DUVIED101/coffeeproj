"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { getPlatform } from "@bystrobarista/core/platform";
import { JobService } from "@bystrobarista/core/services/JobService";
import {
  JobOfferService,
  JobOfferAlreadyAppliedError,
  JobOfferDuplicatePendingError,
} from "@bystrobarista/core/services/JobOfferService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import type { Job } from "@bystrobarista/core/types/job";
import type { JobId, UserId } from "@bystrobarista/core/types/ids";
import {
  clampToEffectiveLength,
  effectiveTextLength,
} from "@bystrobarista/core/utils/textLength";

const MESSAGE_MAX = 280;

// Web port of mobile's OfferJobScreen: pick one of the business's open jobs,
// optionally attach a 280-char message, send via JobOfferService with the
// same duplicate/already-applied error handling.
export default function OfferJobPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
  const params = useParams<{ baristaId: string }>();
  const baristaId = params.baristaId as UserId;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locallyOffered, setLocallyOffered] = useState<Set<string>>(new Set());

  const jobsQuery = useQuery({
    queryKey: ["jobs", "byOwnerOpen", user?.id],
    queryFn: () => JobService.getJobsByOwnerId(user?.id as string, true),
    enabled: Boolean(user?.id),
  });
  const jobs = jobsQuery.data ?? [];

  const pendingOffersQuery = useQuery({
    queryKey: ["offers", "toBarista", user?.id, baristaId],
    queryFn: () =>
      JobOfferService.getPendingOffersFromOwnerToBarista(
        user?.id as UserId,
        baristaId,
      ).catch(() => []),
    enabled: Boolean(user?.id),
  });
  const offeredJobIds = new Set([
    ...(pendingOffersQuery.data ?? []).map((o) => o.jobId as string),
    ...locallyOffered,
  ]);

  const closeModal = (): void => {
    if (isSending) return;
    setSelectedJob(null);
    setMessage("");
  };

  const handleSend = async (): Promise<void> => {
    if (!selectedJob || !user?.id) return;
    setIsSending(true);
    setError(null);
    try {
      await JobOfferService.createOffer({
        businessOwnerId: user.id as UserId,
        baristaId,
        jobId: selectedJob.id as JobId,
        message: message.trim() ? message.trim() : undefined,
      });
      setLocallyOffered((prev) => new Set(prev).add(selectedJob.id));
      setSelectedJob(null);
      setMessage("");
      getPlatform().alert.show(t("common.success"), t("offerJob.success"), [
        { text: t("common.ok") },
      ]);
      router.back();
    } catch (e) {
      if (e instanceof JobOfferAlreadyAppliedError) {
        setError(t("offerJob.baristaAlreadyApplied"));
        setSelectedJob(null);
        setMessage("");
      } else if (e instanceof JobOfferDuplicatePendingError) {
        setError(t("offerJob.duplicatePending"));
        setLocallyOffered((prev) => new Set(prev).add(selectedJob.id));
        setSelectedJob(null);
        setMessage("");
      } else {
        setError(t("offerJob.sendFailure"));
      }
    } finally {
      setIsSending(false);
    }
  };

  const jobMeta = (job: Job): string => {
    const parts: string[] = [];
    if (job.shiftDetails.startDate) {
      parts.push(
        new Date(job.shiftDetails.startDate).toLocaleDateString(locale),
      );
    }
    if (
      job.shiftDetails.kind === "permanent" &&
      typeof job.shiftDetails.hoursPerWeek === "number"
    ) {
      parts.push(
        t("jobDetails.hoursPerWeekShort", {
          hours: job.shiftDetails.hoursPerWeek,
        }),
      );
    } else if (
      job.shiftDetails.kind === "temporary" &&
      job.shiftDetails.startTime
    ) {
      parts.push(job.shiftDetails.startTime);
    }
    return parts.join(" · ");
  };

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <h1 className="text-2xl font-bold">{t("offerJob.title")}</h1>
      <p className="mb-4 mt-1 text-sm text-ink-secondary">
        {t("offerJob.subtitle")}
      </p>

      {error && (
        <p role="alert" className="mb-3 text-sm text-error">
          {error}
        </p>
      )}

      {jobsQuery.isPending ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="mb-3 h-24 animate-pulse rounded-card border border-line bg-bg-secondary"
          />
        ))
      ) : jobs.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-ink-secondary">{t("offerJob.empty")}</p>
          <Link
            href="/jobs/new"
            className="mt-4 inline-block rounded-card bg-primary px-5 py-2.5 text-sm font-semibold text-white"
          >
            {t("offerJob.emptyCta")}
          </Link>
        </div>
      ) : (
        jobs.map((job) => {
          const offered = offeredJobIds.has(job.id);
          return (
            <button
              key={job.id}
              type="button"
              disabled={offered}
              onClick={() => setSelectedJob(job)}
              className={`mb-3 block w-full rounded-card border border-line bg-white p-4 text-left ${
                offered ? "opacity-60" : "hover:shadow-md"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 truncate font-semibold">
                  {job.title}
                </p>
                {offered && (
                  <span className="shrink-0 rounded-chip bg-bg-secondary px-2 py-1 text-xs font-medium text-ink-secondary">
                    {t("offerJob.alreadyOfferedBadge")}
                  </span>
                )}
              </div>
              {job.branchName && (
                <p className="text-sm text-ink-secondary">{job.branchName}</p>
              )}
              <p className="text-xs text-ink-secondary">{jobMeta(job)}</p>
            </button>
          );
        })
      )}

      {selectedJob && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-card bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">
              {t("offerJob.confirmTitle", { title: selectedJob.title })}
            </h2>
            <label className="mt-4 flex flex-col gap-1.5">
              <span className="text-sm font-medium">{t("offerJob.note")}</span>
              <textarea
                rows={3}
                value={message}
                onChange={(e) =>
                  setMessage(
                    clampToEffectiveLength(e.target.value, MESSAGE_MAX),
                  )
                }
                placeholder={t("offerJob.notePlaceholder")}
                className="rounded-input border border-line px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <span className="text-right text-xs text-ink-secondary">
                {t("offerJob.charCounter", {
                  current: effectiveTextLength(message),
                  max: MESSAGE_MAX,
                })}
              </span>
            </label>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSending}
                className="flex-1 rounded-card border border-line px-4 py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={isSending}
                className="flex-1 rounded-card bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {t("offerJob.send")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
