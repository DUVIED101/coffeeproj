"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useParams } from "next/navigation";
import React from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { BusinessService } from "@bystrobarista/core/services/BusinessService";
import { ReviewService } from "@bystrobarista/core/services/ReviewService";
import type { UserId } from "@bystrobarista/core/types/ids";
import { StarRow } from "@/components/StarRow";
import { transformedImageUrl } from "@/lib/imageTransform";
import { safeExternalUrl } from "@/lib/safeUrl";

// Port of BusinessPublicProfileScreen: header with logo/rating/reliability,
// brand links, branches list, "view jobs" CTA.
export default function BusinessPublicProfilePage(): React.JSX.Element {
  const { t } = useTranslation();
  const params = useParams<{ ownerId: string }>();
  const ownerId = params.ownerId as UserId;

  const businessQuery = useQuery({
    queryKey: ["business", "byOwner", ownerId],
    queryFn: () => BusinessService.getBusinessByOwnerId(ownerId),
  });
  const business = businessQuery.data;

  const branchesQuery = useQuery({
    queryKey: ["business", "branches", business?.id],
    queryFn: () => BusinessService.getBranches(business!.id),
    enabled: Boolean(business?.id),
  });

  const aggregateQuery = useQuery({
    queryKey: ["reviews", "aggregate", ownerId],
    queryFn: () => ReviewService.getAggregateForUser(ownerId),
  });

  const reliabilityQuery = useQuery({
    queryKey: ["business", "reliability", ownerId],
    queryFn: () => BusinessService.getBusinessReliabilityScore(ownerId),
  });

  if (businessQuery.isPending) {
    return (
      <div className="mx-auto max-w-2xl animate-pulse">
        <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-bg-secondary" />
        <div className="mx-auto mb-2 h-5 w-1/2 rounded bg-bg-secondary" />
        <div className="mx-auto h-4 w-2/3 rounded bg-bg-secondary" />
      </div>
    );
  }

  if (!business) {
    return (
      <p className="py-16 text-center text-ink-secondary">
        {t("businessPublicProfile.notFound")}
      </p>
    );
  }

  const aggregate = aggregateQuery.data;
  const reliability = reliabilityQuery.data;
  const branches = branchesQuery.data ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-col items-center text-center">
        {business.logoUrl ? (
          <img
            src={transformedImageUrl(business.logoUrl, 72)}
            alt=""
            className="h-[72px] w-[72px] rounded-full bg-bg-secondary object-cover"
          />
        ) : (
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-bg-secondary text-3xl">
            🏪
          </div>
        )}
        <h1 className="mt-3 text-xl font-bold">{business.name}</h1>
        {business.description && (
          <p className="mt-1 text-sm text-ink-secondary">
            {business.description}
          </p>
        )}
        {aggregate && aggregate.reviewCount > 0 && (
          <Link href={`/reviews/${ownerId}`} className="mt-2">
            <StarRow
              rating={aggregate.averageRating}
              count={aggregate.reviewCount}
              showValue
            />
          </Link>
        )}
        {reliability && (
          <p className="mt-1 text-xs text-ink-secondary">
            {t("reliability.sectionTitle")}: {reliability.reliabilityScore} ·{" "}
            {t("reliability.incidents", { count: reliability.disputes30d })}
          </p>
        )}
        <Link
          href={`/businesses/${ownerId}/jobs`}
          className="mt-4 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white"
        >
          {t("businessPublicProfile.viewJobs")}
        </Link>
      </div>

      {(business.website || business.socialLinks.length > 0) && (
        <section className="mt-8">
          <h2 className="mb-2 text-base font-semibold">
            {t("businessProfile.brandSection")}
          </h2>
          <div className="rounded-card border border-line bg-white">
            {safeExternalUrl(business.website) && (
              <a
                href={safeExternalUrl(business.website) as string}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between border-b border-line px-4 py-3 text-sm last:border-b-0 hover:bg-bg-secondary"
              >
                <span>{t("businessProfile.website")}</span>
                <span className="max-w-[60%] truncate text-ink-secondary">
                  {business.website}
                </span>
              </a>
            )}
            {business.socialLinks.map((link, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-line px-4 py-3 text-sm last:border-b-0"
              >
                <span>{t(`socialLinks.${link.platform}`)}</span>
                <span className="max-w-[60%] truncate text-ink-secondary">
                  {link.value}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {branches.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-base font-semibold">
            {t("businessPublicProfile.branchesSection")}
          </h2>
          <div className="rounded-card border border-line bg-white">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className="border-b border-line px-4 py-3 last:border-b-0"
              >
                <p className="text-sm font-medium">{branch.name}</p>
                <p className="text-xs text-ink-secondary">{branch.address}</p>
                {branch.metroStation && (
                  <p className="text-xs text-ink-secondary">
                    Ⓜ {branch.metroStation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
