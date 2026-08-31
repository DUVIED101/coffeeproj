"use client";

import { useParams, useRouter } from "next/navigation";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import { JobService } from "@bystrobarista/core/services/JobService";
import { ApplicationService } from "@bystrobarista/core/services/ApplicationService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import type { Job } from "@bystrobarista/core/types/job";
import { SubmitButton } from "@/components/ui/SubmitButton";

const COVER_LETTER_MAX = 1000;

const compensationLine = (job: Job, t: TFunction, locale: string): string => {
  const amount = `₽${job.compensation.amount.toLocaleString(locale)}`;
  switch (job.compensation.type) {
    case "hourly":
      return t("apply.perHour", { amount });
    case "daily":
      return t("apply.perDay", { amount });
    default:
      return amount;
  }
};

export default function ApplyPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;
  const userId = useAuthStore((s) => s.user?.id);

  const [coverLetter, setCoverLetter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const jobQuery = useQuery({
    queryKey: ["jobs", "byId", jobId],
    queryFn: () => JobService.getJobById(jobId),
  });
  const job = jobQuery.data;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    if (!userId) {
      setError(t("apply.errorNotAuthenticated"));
      return;
    }
    setSubmitting(true);
    try {
      await ApplicationService.createApplication({
        jobId,
        baristaId: userId,
        coverLetter: coverLetter.trim() || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["applications"] });
      setNotice(t("apply.success"));
      setTimeout(() => router.push("/applications"), 900);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.startsWith("COOLDOWN:")) {
        const until = new Date(message.slice("COOLDOWN:".length));
        setError(
          t("apply.cooldown", {
            date: until.toLocaleString(locale, {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            }),
          }),
        );
      } else if (message.includes("already applied")) {
        setError(t("apply.duplicate"));
      } else {
        setError(t("apply.errorFailed"));
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">{t("apply.title")}</h1>

      {job && (
        <section className="mb-6 rounded-card border border-line bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold text-ink-secondary">
            {t("apply.jobSummary")}
          </h2>
          <p className="font-semibold">{job.title}</p>
          <p className="text-sm text-ink-secondary">
            {job.businessName}
            {job.branchName && ` • ${job.branchName}`}
          </p>
          <p className="mt-1 text-sm font-semibold text-primary">
            {compensationLine(job, t, locale)}
          </p>
        </section>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="cover-letter"
            className="mb-1 block text-sm font-medium"
          >
            {t("apply.coverLetter")}
          </label>
          <textarea
            id="cover-letter"
            rows={6}
            value={coverLetter}
            onChange={(e) =>
              setCoverLetter(e.target.value.slice(0, COVER_LETTER_MAX))
            }
            placeholder={t("apply.coverLetterPlaceholder")}
            className="w-full rounded-input border border-line px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <p className="mt-1 text-right text-xs text-ink-secondary">
            {t("apply.charCounter", {
              count: COVER_LETTER_MAX - coverLetter.length,
            })}
          </p>
        </div>

        {notice && <p className="text-sm text-success">{notice}</p>}
        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}

        <SubmitButton label={t("apply.submitCta")} loading={submitting} />
      </form>
    </div>
  );
}
