"use client";

import { useParams } from "next/navigation";
import React from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ApplicationService } from "@bystrobarista/core/services/ApplicationService";
import { DISPUTE_SEVERITY_BORDER, DISPUTE_STATUS_BADGE } from "@/lib/disputeUi";

// Port of DisputeDetailsScreen: read-only — status, categories, severity,
// description (label depends on whether the viewer filed it), admin
// resolution note. Moderation happens backend-side only.
export default function DisputeDetailsPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
  const params = useParams<{ disputeId: string }>();

  const disputeQuery = useQuery({
    queryKey: ["disputes", "byId", params.disputeId],
    queryFn: () => ApplicationService.getDisputeById(params.disputeId),
  });

  if (disputeQuery.isPending) {
    return (
      <div className="mx-auto h-64 max-w-2xl animate-pulse rounded-card bg-bg-secondary" />
    );
  }

  const dispute = disputeQuery.data;
  if (!dispute) {
    return (
      <p className="py-16 text-center text-ink-secondary">
        {t("disputes.notFound")}
      </p>
    );
  }

  const isPending =
    dispute.status === "submitted" || dispute.status === "under_review";

  return (
    <div className="mx-auto max-w-2xl pb-10">
      <h1 className="mb-4 text-2xl font-bold">{t("disputes.detailsTitle")}</h1>

      <div className="mb-6 flex items-center gap-3">
        <span
          className={`rounded-chip px-3 py-1 text-sm font-semibold text-white ${DISPUTE_STATUS_BADGE[dispute.status]}`}
        >
          {t(`disputes.status.${dispute.status}`)}
        </span>
        <span className="text-sm text-ink-secondary">
          {new Date(dispute.createdAt).toLocaleDateString(locale, {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-ink-secondary">
          {t("disputes.categoryLabel")}
        </h2>
        <div className="flex flex-wrap gap-2">
          {dispute.categories.map((code) => (
            <span
              key={code}
              className="rounded-chip bg-bg-secondary px-3 py-1.5 text-sm"
            >
              {t(`disputes.category.${code}`)}
            </span>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-ink-secondary">
          {t("disputes.severityLabel")}
        </h2>
        <span
          className={`inline-block rounded-chip border bg-white px-3 py-1.5 text-sm font-medium ${
            DISPUTE_SEVERITY_BORDER[dispute.severity] ?? "border-line"
          }`}
        >
          {t(`disputes.severity.${dispute.severity}`)}
        </span>
      </section>

      {dispute.description && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-ink-secondary">
            {dispute.myRole === "reporter"
              ? t("disputes.descriptionLabelOwn")
              : t("disputes.descriptionLabelAgainst")}
          </h2>
          <p className="whitespace-pre-line rounded-card border border-line bg-white p-4 text-sm">
            {dispute.description}
          </p>
        </section>
      )}

      {dispute.resolutionNote && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-ink-secondary">
            {t("disputes.resolutionNote")}
          </h2>
          <p className="whitespace-pre-line rounded-card border border-line bg-white p-4 text-sm">
            {dispute.resolutionNote}
          </p>
        </section>
      )}

      {isPending && (
        <p className="rounded-card bg-bg-secondary p-4 text-sm text-ink-secondary">
          {t("disputes.pendingNote")}
        </p>
      )}
    </div>
  );
}
