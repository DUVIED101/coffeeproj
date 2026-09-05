"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { JobService } from "@bystrobarista/core/services/JobService";
import { BaristaProfileService } from "@bystrobarista/core/services/BaristaProfileService";
import { ReviewService } from "@bystrobarista/core/services/ReviewService";
import { ApplicationService } from "@bystrobarista/core/services/ApplicationService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import {
  requestLocationPermission,
  getCurrentLocation,
  getLastKnownLocationFast,
} from "@bystrobarista/core/utils/geolocation";
import type { Job, JobFilters } from "@bystrobarista/core/types/job";
import type { GeoPoint } from "@bystrobarista/core/types/business";
import type { UserId } from "@bystrobarista/core/types/ids";
import type { UserReviewAggregate } from "@bystrobarista/core/types/review";
import { JobCard } from "@/components/JobCard";
import { FilterBar } from "@/components/FilterBar";

function SkeletonCard(): React.JSX.Element {
  return (
    <div className="mb-3 animate-pulse rounded-card border border-line bg-white p-4">
      <div className="mb-2 h-4 w-2/3 rounded bg-bg-secondary" />
      <div className="mb-2 h-3 w-1/2 rounded bg-bg-secondary" />
      <div className="mb-2 h-3 w-2/5 rounded bg-bg-secondary" />
      <div className="h-3 w-1/3 rounded bg-bg-secondary" />
    </div>
  );
}

// Same banner threshold as the apply gate in job details (20%).
const MIN_COMPLETENESS_TO_APPLY = 20;

function BaristaJobFeed(): React.JSX.Element {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.user?.id);
  const [userLocation, setUserLocation] = useState<GeoPoint | undefined>(
    undefined,
  );
  const [filters, setFilters] = useState<JobFilters>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await getLastKnownLocationFast();
      if (cached && !cancelled) setUserLocation(cached);
      const hasPermission = await requestLocationPermission();
      if (!hasPermission || cancelled) return;
      const location = await getCurrentLocation();
      if (location && !cancelled) setUserLocation(location);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const jobsQuery = useQuery({
    queryKey: ["jobs", "search", filters, userLocation ?? null],
    queryFn: () => JobService.searchJobs(filters, userLocation),
  });

  const profileQuery = useQuery({
    queryKey: ["baristaProfile", userId],
    queryFn: () => BaristaProfileService.getProfileByUserId(userId as string),
    enabled: Boolean(userId),
  });

  const appliedQuery = useQuery({
    queryKey: ["applications", "appliedJobIds", userId],
    queryFn: () => ApplicationService.getActiveAppliedJobIds(userId as string),
    enabled: Boolean(userId),
  });

  const ownerIds = useMemo<ReadonlyArray<UserId>>(
    () =>
      (jobsQuery.data ?? [])
        .map((j) => j.businessOwnerId as UserId | undefined)
        .filter((id): id is UserId => Boolean(id)),
    [jobsQuery.data],
  );

  const ownerAggregatesQuery = useQuery({
    queryKey: ["reviews", "aggregates", ownerIds],
    queryFn: () => ReviewService.getAggregatesForUsers([...ownerIds]),
    enabled: ownerIds.length > 0,
  });

  const jobs = jobsQuery.data ?? [];
  const appliedJobIds = appliedQuery.data ?? new Set<string>();
  const ownerAggregates =
    ownerAggregatesQuery.data ?? new Map<UserId, UserReviewAggregate>();
  const baristaProfile = profileQuery.data ?? null;
  const showProfileBanner =
    profileQuery.isSuccess &&
    (!baristaProfile ||
      baristaProfile.profileCompleteness < MIN_COMPLETENESS_TO_APPLY);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("jobFeed.title")}</h1>

      {showProfileBanner && (
        <Link
          href="/profile/edit"
          data-tour="profile.createCta"
          className="mb-4 flex items-center justify-between rounded-card border border-[#FCD34D] bg-[#FEF3C7] px-4 py-3"
        >
          <span>
            <span className="block font-semibold text-[#92400E]">
              {t("jobFeed.profileBannerTitle")}
            </span>
            <span className="block text-sm text-[#92400E]">
              {!baristaProfile
                ? t("jobFeed.profileBannerSubtitleNoProfile")
                : t("jobFeed.profileBannerSubtitlePercent", {
                    percent: baristaProfile.profileCompleteness,
                  })}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="text-2xl font-semibold text-[#92400E]"
          >
            ›
          </span>
        </Link>
      )}

      <div data-tour="feed.filters">
        <FilterBar
          filters={filters}
          userLocation={userLocation}
          onChange={setFilters}
        />
      </div>

      {jobsQuery.isPending ? (
        <div>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : jobsQuery.isError ? (
        <div className="py-16 text-center">
          <p className="mb-3 text-ink-secondary">
            {t("jobFeed.loadFailedBody")}
          </p>
          <button
            type="button"
            onClick={() => void jobsQuery.refetch()}
            className="rounded-input bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            {t("jobDetails.retry")}
          </button>
        </div>
      ) : jobs.length === 0 ? (
        <div className="py-16 text-center">
          <p className="mb-2 text-lg font-semibold text-ink-secondary">
            {t("jobFeed.empty")}
          </p>
          <p className="text-sm text-ink-secondary">
            {t("jobFeed.emptyHintFilters")}
          </p>
        </div>
      ) : (
        <div className="md:grid md:grid-cols-2 md:gap-4 md:[&>a]:mb-0">
          {jobs.map((job: Job, index: number) => (
            <JobCard
              key={job.id}
              job={job}
              tourKey={index === 0 ? "feed.firstJob" : undefined}
              ownerAggregate={ownerAggregates.get(
                job.businessOwnerId as UserId,
              )}
              alreadyApplied={appliedJobIds.has(job.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function JobsPage(): React.JSX.Element {
  const accountType = useAuthStore((s) => s.user?.accountType);
  const router = useRouter();

  // Shared path: barista sees the feed; business jobs live on /dashboard
  // (mobile's BusinessHomeScreen), so business visitors are redirected.
  useEffect(() => {
    if (accountType === "business") router.replace("/dashboard");
  }, [accountType, router]);

  if (accountType === "business") return <></>;
  return <BaristaJobFeed />;
}
