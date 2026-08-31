"use client";

import Link from "next/link";
import React from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ApplicationService } from "@bystrobarista/core/services/ApplicationService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import type { MyDisputeItem } from "@bystrobarista/core/types/application";
import { DISPUTE_STATUS_BADGE } from "@/lib/disputeUi";
import { formatDateOnly } from "@/lib/dates";

function DisputeRow({
  dispute,
  locale,
}: {
  dispute: MyDisputeItem;
  locale: string;
}): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <Link
      href={`/disputes/${dispute.id}`}
      className="mb-2 flex items-start justify-between gap-3 rounded-card border border-line bg-white p-3 hover:border-primary/40"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">
          {dispute.jobTitle || t("disputes.unknownJob")}
        </p>
        {dispute.businessName && (
          <p className="truncate text-xs text-ink-secondary">
            {dispute.businessName}
          </p>
        )}
        <p className="mt-0.5 text-xs text-ink-secondary">
          {dispute.categories
            .map((c) => t(`disputes.category.${c}`))
            .join(", ")}
        </p>
        <p className="mt-0.5 text-[11px] text-ink-secondary">
          {formatDateOnly(dispute.createdAt, locale, {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-chip px-2 py-1 text-xs font-semibold text-white ${DISPUTE_STATUS_BADGE[dispute.status]}`}
      >
        {t(`disputes.status.${dispute.status}`)}
      </span>
    </Link>
  );
}

// Port of MyDisputesScreen: disputes filed against me, then filed by me.
export default function MyDisputesPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
  const userId = useAuthStore((s) => s.user?.id);

  const disputesQuery = useQuery({
    queryKey: ["disputes", "mine", userId],
    queryFn: async () => {
      const [filed, against] = await Promise.all([
        ApplicationService.getMyFiledDisputes(),
        ApplicationService.getDisputesAgainstMe(),
      ]);
      return { filed, against };
    },
    enabled: Boolean(userId),
  });

  if (disputesQuery.isPending) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-4 text-2xl font-bold">
          {t("disputes.myDisputesTitle")}
        </h1>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="mb-2 h-24 animate-pulse rounded-card border border-line bg-bg-secondary"
          />
        ))}
      </div>
    );
  }

  const filed = disputesQuery.data?.filed ?? [];
  const against = disputesQuery.data?.against ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">
        {t("disputes.myDisputesTitle")}
      </h1>

      {filed.length === 0 && against.length === 0 ? (
        <p className="py-16 text-center text-ink-secondary">
          {t("disputes.myDisputesEmpty")}
        </p>
      ) : (
        <>
          {against.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-2 text-sm font-semibold text-ink-secondary">
                {t("disputes.sectionAgainstMe")}
              </h2>
              {against.map((d) => (
                <DisputeRow key={d.id} dispute={d} locale={locale} />
              ))}
            </section>
          )}
          {filed.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-ink-secondary">
                {t("disputes.sectionFiledByMe")}
              </h2>
              {filed.map((d) => (
                <DisputeRow key={d.id} dispute={d} locale={locale} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
