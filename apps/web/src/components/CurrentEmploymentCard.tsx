"use client";

import Link from "next/link";
import React from "react";
import { useTranslation } from "react-i18next";
import type { Employment } from "@bystrobarista/core/types/employment";
import { employmentStageLine } from "@/lib/employmentUi";

// Barista's current permanent position, pinned above the applications list.
export function CurrentEmploymentCard({
  employment,
}: {
  employment: Employment;
}): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
  const job = employment.job;
  const place = [
    job?.branchName,
    job?.metroStation ? `Ⓜ ${job.metroStation}` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="mb-4 rounded-card border border-primary bg-white p-4">
      <p className="text-xs font-semibold uppercase text-primary">
        {t("employment.currentJob")}
      </p>
      <p className="mt-1 font-semibold">
        {job?.businessName ?? t("applications.fallbackBusiness")}
      </p>
      <p className="text-sm text-ink-secondary">
        {job?.title ?? t("applications.fallbackJob")}
      </p>
      {place && <p className="text-sm text-ink-secondary">{place}</p>}
      <p className="mt-2 text-sm">
        {employmentStageLine(employment, t, locale)}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={`/applications/${employment.applicationId}`}
          className="rounded-input bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          {t("employment.openDetails")}
        </Link>
        <Link
          href={`/chats?applicationId=${employment.applicationId}`}
          className="rounded-input border border-primary px-4 py-2 text-sm font-medium text-primary"
        >
          {t("applications.messageBusiness")}
        </Link>
      </div>
    </section>
  );
}
