"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import React from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  mdiStorefrontOutline,
  mdiWeb,
  mdiMapMarkerMultiple,
  mdiStarOutline,
  mdiShieldCheckOutline,
  mdiCheckCircle,
  mdiAlertCircleOutline,
} from "@mdi/js";
import { BusinessService } from "@bystrobarista/core/services/BusinessService";
import { ReviewService } from "@bystrobarista/core/services/ReviewService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import type { SocialLink } from "@bystrobarista/core/types/business";
import type { UserId } from "@bystrobarista/core/types/ids";
import { transformedImageUrl } from "@/lib/imageTransform";
import { MdiIcon } from "@/components/MdiIcon";

const stripAt = (value: string): string => value.replace(/^@+/, "");

// Same URL-building rules as mobile's BusinessProfileScreen: bare handles get
// their platform prefix; 'other' entries are display-only.
const buildSocialLinkUrl = (link: SocialLink): string | null => {
  const value = link.value.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  switch (link.platform) {
    case "instagram":
      return `https://instagram.com/${stripAt(value)}`;
    case "telegram":
      return `https://t.me/${stripAt(value)}`;
    case "vk":
      return value.startsWith("vk.com")
        ? `https://${value}`
        : `https://vk.com/${stripAt(value)}`;
    case "website":
      return `https://${value}`;
    default:
      return null;
  }
};

function InfoRow({
  icon,
  label,
  value,
  href,
  external,
}: {
  icon: string;
  label: string;
  value: string;
  href?: string;
  external?: boolean;
}): React.JSX.Element {
  const content = (
    <>
      <MdiIcon path={icon} size={20} className="shrink-0 text-ink-secondary" />
      <span className="flex-1 text-sm">{label}</span>
      <span className="max-w-[50%] truncate text-sm text-ink-secondary">
        {value}
      </span>
    </>
  );
  const rowClass =
    "flex items-center gap-3 border-t border-line py-2.5 first:border-t-0";
  if (href && external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${rowClass} hover:text-primary`}
      >
        {content}
      </a>
    );
  }
  if (href) {
    return (
      <Link href={href} className={`${rowClass} hover:text-primary`}>
        {content}
      </Link>
    );
  }
  return <div className={rowClass}>{content}</div>;
}

// Web port of mobile's BusinessProfileScreen (view): logo header with
// verification badge, brand links, organization rows (branches, reviews,
// reliability).
export function BusinessProfileView(): React.JSX.Element {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;

  const businessQuery = useQuery({
    queryKey: ["business", "byOwner", userId],
    queryFn: () => BusinessService.getBusinessByOwnerId(userId as string),
    enabled: Boolean(userId),
  });
  const business = businessQuery.data;

  const branchesQuery = useQuery({
    queryKey: ["branches", business?.id],
    queryFn: () => BusinessService.getBranches(business?.id as string),
    enabled: Boolean(business?.id),
  });

  const aggregateQuery = useQuery({
    queryKey: ["reviews", "aggregate", userId],
    queryFn: () => ReviewService.getAggregateForUser(userId as UserId),
    enabled: Boolean(userId) && Boolean(business),
  });

  const reliabilityQuery = useQuery({
    queryKey: ["business", "reliability", userId],
    queryFn: () =>
      BusinessService.getBusinessReliabilityScore(userId as UserId).catch(
        () => null,
      ),
    enabled: Boolean(userId) && Boolean(business),
  });

  if (businessQuery.isPending) {
    return <div className="h-64 animate-pulse rounded-card bg-bg-secondary" />;
  }

  if (!business) {
    return (
      <div className="rounded-card border border-line bg-white p-6 text-center">
        <MdiIcon
          path={mdiStorefrontOutline}
          size={48}
          className="mx-auto text-ink-secondary"
        />
        <p className="mt-3 font-semibold">
          {t("businessProfile.noBusinessTitle")}
        </p>
        <p className="mt-1 text-sm text-ink-secondary">
          {t("businessProfile.noBusinessSubtitle")}
        </p>
        <Link
          href="/profile/edit"
          className="mt-4 inline-block rounded-card bg-primary px-5 py-2.5 text-sm font-semibold text-white"
        >
          {t("businessProfile.createCta")}
        </Link>
      </div>
    );
  }

  const aggregate = aggregateQuery.data;
  const reliability = reliabilityQuery.data;
  const branchCount = branchesQuery.data?.length ?? 0;
  const hasBrand = Boolean(business.website) || business.socialLinks.length > 0;

  return (
    <>
      <div className="rounded-card border border-line bg-white p-4">
        <div className="flex items-center gap-4">
          {business.logoUrl ? (
            <img
              src={transformedImageUrl(business.logoUrl, 144)}
              alt=""
              className="h-18 w-18 h-[72px] w-[72px] rounded-full object-cover"
            />
          ) : (
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-bg-secondary">
              <MdiIcon
                path={mdiStorefrontOutline}
                size={32}
                className="text-ink-secondary"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xl font-bold">{business.name}</p>
            {business.description && (
              <p className="mt-0.5 line-clamp-4 text-sm text-ink-secondary">
                {business.description}
              </p>
            )}
            <p
              className={`mt-1 flex items-center gap-1 text-xs font-medium ${
                business.isVerified ? "text-success" : "text-warning"
              }`}
            >
              <MdiIcon
                path={
                  business.isVerified ? mdiCheckCircle : mdiAlertCircleOutline
                }
                size={14}
              />
              {t(
                business.isVerified
                  ? "businessProfile.verified"
                  : "businessProfile.unverified",
              )}
            </p>
          </div>
        </div>
        <Link
          href="/profile/edit"
          className="mt-3 inline-block rounded-input bg-primary px-3 py-1.5 text-sm font-medium text-white"
        >
          {t("businessProfile.editProfile")}
        </Link>
      </div>

      {hasBrand && (
        <div className="mt-4 rounded-card border border-line bg-white p-4">
          <h2 className="mb-2 text-base font-semibold">
            {t("businessProfile.brandSection")}
          </h2>
          {business.website && (
            <InfoRow
              icon={mdiWeb}
              label={t("businessProfile.website")}
              value={business.website.replace(/^https?:\/\//i, "")}
              href={
                /^https?:\/\//i.test(business.website)
                  ? business.website
                  : `https://${business.website}`
              }
              external
            />
          )}
          {business.socialLinks.map((link, index) => {
            const url = buildSocialLinkUrl(link);
            return (
              <InfoRow
                key={`${link.platform}-${index}`}
                icon={mdiWeb}
                label={t(`socialLinks.${link.platform}`)}
                value={link.value}
                href={url ?? undefined}
                external
              />
            );
          })}
        </div>
      )}

      <div className="mt-4 rounded-card border border-line bg-white p-4">
        <h2 className="mb-2 text-base font-semibold">
          {t("businessProfile.organizationSection")}
        </h2>
        <InfoRow
          icon={mdiMapMarkerMultiple}
          label={t("businessProfile.branches")}
          value={t("businessProfile.branchesCount", { count: branchCount })}
          href="/branches"
        />
        <InfoRow
          icon={mdiStarOutline}
          label={t("businessProfile.reviews")}
          value={
            aggregate && aggregate.reviewCount > 0
              ? `${aggregate.averageRating.toFixed(1)} ★ · ${aggregate.reviewCount}`
              : t("businessProfile.noReviews")
          }
          href={`/reviews/${userId}`}
        />
        {reliability && (
          <InfoRow
            icon={mdiShieldCheckOutline}
            label={t("reliability.sectionTitle")}
            value={`${t("reliability.scoreOf", {
              score: reliability.reliabilityScore,
            })} · ${
              reliability.disputes30d > 0
                ? t("reliability.incidents", {
                    count: reliability.disputes30d,
                  })
                : t("reliability.noIncidents")
            }`}
          />
        )}
      </div>
    </>
  );
}
