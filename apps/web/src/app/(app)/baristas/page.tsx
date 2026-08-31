"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  BaristaSearchService,
  BARISTA_SEARCH_PAGE_SIZE,
} from "@bystrobarista/core/services/BaristaSearchService";
import { BusinessService } from "@bystrobarista/core/services/BusinessService";
import { ReviewService } from "@bystrobarista/core/services/ReviewService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import { EQUIPMENT_TYPES } from "@bystrobarista/core/config/constants";
import type {
  BaristaFilters,
  BaristaProfile,
  ShiftTime,
  DayOfWeek,
  WorkloadType,
} from "@bystrobarista/core/types/baristaProfile";
import {
  DAYS_OF_WEEK,
  WORKLOAD_TYPES,
} from "@bystrobarista/core/types/baristaProfile";
import type { Equipment } from "@bystrobarista/core/types/business";
import type { CityCode } from "@bystrobarista/core/types/city";
import { CITY_CODES } from "@bystrobarista/core/types/city";
import type { UserId } from "@bystrobarista/core/types/ids";
import type { UserReviewAggregate } from "@bystrobarista/core/types/review";
import { StarRow } from "@/components/StarRow";
import { transformedImageUrl } from "@/lib/imageTransform";

const SHIFT_TIMES: ShiftTime[] = ["morning", "afternoon", "evening", "night"];
const EXPERIENCE_OPTIONS = [0, 1, 3, 5, 10];
const HOURLY_CAP_OPTIONS = [300, 500, 800, 1000, 1500];

const chip = (active: boolean): string =>
  `rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
    active
      ? "border-primary bg-primary text-white"
      : "border-line bg-white text-ink"
  }`;

const filterLabel =
  "text-xs font-semibold uppercase tracking-wide text-ink-secondary";

function BaristaCard({
  profile,
  aggregate,
}: {
  profile: BaristaProfile;
  aggregate?: UserReviewAggregate;
}): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
  const visibleEquipment = profile.equipmentExperience.slice(0, 3);
  const remaining = profile.equipmentExperience.length - 3;
  const rate =
    profile.hourlyRateMin != null && profile.hourlyRateMax != null
      ? profile.hourlyRateMin === profile.hourlyRateMax
        ? t("barista.hourlySingle", {
            amount: `₽${profile.hourlyRateMin.toLocaleString(locale)}`,
          })
        : t("barista.hourlyRange", {
            min: `₽${profile.hourlyRateMin.toLocaleString(locale)}`,
            max: `₽${profile.hourlyRateMax.toLocaleString(locale)}`,
          })
      : profile.hourlyRateMin != null
        ? t("barista.hourlySingle", {
            amount: `₽${profile.hourlyRateMin.toLocaleString(locale)}`,
          })
        : null;

  return (
    <Link
      href={`/baristas/${profile.userId}`}
      className="mb-3 block rounded-card border border-line bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        {profile.avatarUrl ? (
          <img
            src={transformedImageUrl(profile.avatarUrl, 160)}
            alt=""
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
            {profile.firstName[0]}
            {profile.lastName[0]}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            {profile.firstName} {profile.lastName}
          </p>
          <p className="text-sm text-ink-secondary">
            {t(`city.codes.${profile.city}`, { defaultValue: profile.city })}
          </p>
          {aggregate && aggregate.reviewCount > 0 ? (
            <StarRow
              rating={aggregate.averageRating}
              count={aggregate.reviewCount}
              showValue
            />
          ) : (
            <p className="text-xs text-ink-secondary">
              {t("reviews.noRatingsShort")}
            </p>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {profile.yearsOfExperience != null && (
          <span>
            {t("barista.experienceYears", {
              count: profile.yearsOfExperience,
            })}
          </span>
        )}
        {rate && <span className="font-semibold text-primary">{rate}</span>}
        <span className="text-xs text-ink-secondary">
          {t("barista.profileCompleteness", {
            percent: Math.min(100, Math.max(0, profile.profileCompleteness)),
          })}
        </span>
      </div>

      {profile.equipmentExperience.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {visibleEquipment.map((equipment) => (
            <span
              key={equipment}
              className="rounded-chip bg-bg-secondary px-2 py-1 text-xs text-ink-secondary"
            >
              {equipment}
            </span>
          ))}
          {remaining > 0 && (
            <span className="rounded-chip bg-bg-secondary px-2 py-1 text-xs text-ink-secondary">
              +{remaining}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

// Web port of mobile's BaristaFeedScreen: filter bar (branch preset,
// equipment, shift, experience, hourly cap, city, availability, workload,
// days) over search_baristas results with review aggregates.
export default function BaristasPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
  const userId = useAuthStore((s) => s.user?.id);
  const [filters, setFilters] = useState<BaristaFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [branchPresetOn, setBranchPresetOn] = useState(false);

  const businessQuery = useQuery({
    queryKey: ["business", "byOwner", userId],
    queryFn: () => BusinessService.getBusinessByOwnerId(userId as string),
    enabled: Boolean(userId),
  });
  const businessId = businessQuery.data?.id;

  const branchesQuery = useQuery({
    queryKey: ["branches", businessId],
    queryFn: () => BusinessService.getBranches(businessId as string),
    enabled: Boolean(businessId),
  });
  const branches = useMemo(
    () => branchesQuery.data ?? [],
    [branchesQuery.data],
  );
  const branchMetroStations = useMemo(
    () => [
      ...new Set(
        branches
          .map((b) => b.metroStation)
          .filter((s): s is string => Boolean(s)),
      ),
    ],
    [branches],
  );
  const branchCities = useMemo(
    () => [...new Set(branches.map((b) => b.city))],
    [branches],
  );

  const baristasQuery = useInfiniteQuery({
    queryKey: ["baristas", "search", filters],
    queryFn: ({ pageParam }) =>
      BaristaSearchService.searchBaristas(filters, pageParam),
    initialPageParam: 0,
    // A short page means the server ran out of matches.
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.length === BARISTA_SEARCH_PAGE_SIZE
        ? lastPageParam + 1
        : undefined,
  });
  const baristas = useMemo(
    () => (baristasQuery.data?.pages ?? []).flat(),
    [baristasQuery.data],
  );

  const baristaIds = useMemo(
    () => baristas.map((b) => b.userId as UserId),
    [baristas],
  );
  const aggregatesQuery = useQuery({
    queryKey: ["reviews", "aggregates", baristaIds],
    queryFn: () => ReviewService.getAggregatesForUsers(baristaIds),
    enabled: baristaIds.length > 0,
  });
  const aggregates =
    aggregatesQuery.data ?? new Map<UserId, UserReviewAggregate>();

  const toggleBranchPreset = (): void => {
    const next = !branchPresetOn;
    setBranchPresetOn(next);
    setFilters({
      ...filters,
      metroStations: next ? branchMetroStations : undefined,
      branchCitiesAny: next ? branchCities : undefined,
    });
  };

  const toggleIn = <T,>(list: T[] | undefined, value: T): T[] | undefined => {
    const current = list ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    return next.length > 0 ? next : undefined;
  };

  const activeFilterCount = [
    filters.equipment?.length,
    filters.shiftTimes?.length,
    filters.minYearsExperience,
    filters.hourlyRateMax,
    filters.city,
    filters.availableFromDateMax,
    filters.workloadTypesAny?.length,
    filters.availableDaysAny?.length,
  ].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <h1 className="mb-4 text-2xl font-bold">{t("baristaFeed.title")}</h1>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {branchMetroStations.length > 0 && (
          <button
            type="button"
            onClick={toggleBranchPreset}
            className={chip(branchPresetOn)}
          >
            {t("baristaFilterBar.branchPreset")}
          </button>
        )}
        <button
          type="button"
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={chip(activeFilterCount > 0 || filtersOpen)}
        >
          {t("shifts.filter.title")}
          {activeFilterCount > 0 && ` (${activeFilterCount})`}
        </button>
        {(activeFilterCount > 0 || branchPresetOn) && (
          <button
            type="button"
            onClick={() => {
              setFilters({});
              setBranchPresetOn(false);
            }}
            className="text-sm font-medium text-primary"
          >
            {t("baristaFilterBar.reset")}
          </button>
        )}
      </div>

      {filtersOpen && (
        <div className="mb-4 flex flex-col gap-4 rounded-card border border-line bg-white p-4">
          <div className="flex flex-col gap-1.5">
            <span className={filterLabel}>
              {t("baristaFilterBar.equipment")}
            </span>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_TYPES.map((equipment) => (
                <button
                  key={equipment}
                  type="button"
                  onClick={() =>
                    setFilters({
                      ...filters,
                      equipment: toggleIn(
                        filters.equipment,
                        equipment as Equipment,
                      ),
                    })
                  }
                  className={chip(
                    Boolean(filters.equipment?.includes(equipment)),
                  )}
                >
                  {equipment}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className={filterLabel}>{t("baristaFilterBar.shift")}</span>
            <div className="flex flex-wrap gap-2">
              {SHIFT_TIMES.map((shift) => (
                <button
                  key={shift}
                  type="button"
                  onClick={() =>
                    setFilters({
                      ...filters,
                      shiftTimes: toggleIn(filters.shiftTimes, shift),
                    })
                  }
                  className={chip(Boolean(filters.shiftTimes?.includes(shift)))}
                >
                  {t(`shiftTimes.${shift}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className={filterLabel}>
              {t("baristaFilterBar.chooseExperience")}
            </span>
            <div className="flex flex-wrap gap-2">
              {EXPERIENCE_OPTIONS.map((years) => {
                const active =
                  years === 0
                    ? filters.minYearsExperience == null
                    : filters.minYearsExperience === years;
                return (
                  <button
                    key={years}
                    type="button"
                    onClick={() =>
                      setFilters({
                        ...filters,
                        minYearsExperience: years === 0 ? undefined : years,
                      })
                    }
                    className={chip(active)}
                  >
                    {years === 0
                      ? t("baristaFilterBar.experienceAny")
                      : t("baristaFilterBar.experienceWithValue", {
                          value: years,
                        })}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className={filterLabel}>
              {t("baristaFilterBar.chooseHourlyCap")}
            </span>
            <div className="flex flex-wrap gap-2">
              {HOURLY_CAP_OPTIONS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() =>
                    setFilters({
                      ...filters,
                      hourlyRateMax:
                        filters.hourlyRateMax === amount ? undefined : amount,
                    })
                  }
                  className={chip(filters.hourlyRateMax === amount)}
                >
                  {t("baristaFilterBar.hourlyCapOption", {
                    amount: amount.toLocaleString(locale),
                  })}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className={filterLabel}>
              {t("baristaFilterBar.cityPlaceholder")}
            </span>
            <div className="flex flex-wrap gap-2">
              {CITY_CODES.map((code: CityCode) => (
                <button
                  key={code}
                  type="button"
                  onClick={() =>
                    setFilters({
                      ...filters,
                      city: filters.city === code ? undefined : code,
                    })
                  }
                  className={chip(filters.city === code)}
                >
                  {t(`city.codes.${code}`)}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className={filterLabel}>
              {t("baristaFilterBar.chooseAvailableFrom")}
            </span>
            <input
              type="date"
              value={filters.availableFromDateMax ?? ""}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  availableFromDateMax: e.target.value || undefined,
                })
              }
              className="rounded-input border border-line px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className={filterLabel}>
              {t("baristaFilterBar.workload")}
            </span>
            <div className="flex flex-wrap gap-2">
              {WORKLOAD_TYPES.map((type: WorkloadType) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setFilters({
                      ...filters,
                      workloadTypesAny: toggleIn(
                        filters.workloadTypesAny,
                        type,
                      ),
                    })
                  }
                  className={chip(
                    Boolean(filters.workloadTypesAny?.includes(type)),
                  )}
                >
                  {t(`workloadType.${type}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className={filterLabel}>{t("baristaFilterBar.days")}</span>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day: DayOfWeek) => (
                <button
                  key={day}
                  type="button"
                  onClick={() =>
                    setFilters({
                      ...filters,
                      availableDaysAny: toggleIn(filters.availableDaysAny, day),
                    })
                  }
                  className={chip(
                    Boolean(filters.availableDaysAny?.includes(day)),
                  )}
                >
                  {t(`dayOfWeek.${day}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {baristasQuery.isPending ? (
        Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="mb-3 h-32 animate-pulse rounded-card border border-line bg-bg-secondary"
          />
        ))
      ) : baristasQuery.isError ? (
        <p className="py-16 text-center text-sm text-ink-secondary">
          {t("baristaFeed.loadFailedBody")}
        </p>
      ) : baristas.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-semibold text-ink-secondary">
            {t("baristaFeed.empty")}
          </p>
          <p className="mt-1 text-sm text-ink-secondary">
            {t("baristaFeed.emptyHint")}
          </p>
        </div>
      ) : (
        <>
          {baristas.map((profile) => (
            <BaristaCard
              key={profile.id}
              profile={profile}
              aggregate={aggregates.get(profile.userId as UserId)}
            />
          ))}
          {baristasQuery.hasNextPage && (
            <button
              type="button"
              onClick={() => void baristasQuery.fetchNextPage()}
              disabled={baristasQuery.isFetchingNextPage}
              className="mt-2 w-full rounded-card border border-line bg-white px-4 py-3 text-sm font-medium text-primary hover:bg-bg-secondary disabled:opacity-50"
            >
              {baristasQuery.isFetchingNextPage ? "…" : t("common.showMore")}
            </button>
          )}
        </>
      )}
    </div>
  );
}
