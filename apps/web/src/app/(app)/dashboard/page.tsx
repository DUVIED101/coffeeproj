"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { mdiStorefrontOutline } from "@mdi/js";
import { getPlatform } from "@bystrobarista/core/platform";
import { BusinessService } from "@bystrobarista/core/services/BusinessService";
import { JobService } from "@bystrobarista/core/services/JobService";
import { ApplicationService } from "@bystrobarista/core/services/ApplicationService";
import { EmploymentService } from "@bystrobarista/core/services/EmploymentService";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import type { Job, JobStatus } from "@bystrobarista/core/types/job";
import type { Application } from "@bystrobarista/core/types/application";
import type {
  Employment,
  EmploymentEndReason,
} from "@bystrobarista/core/types/employment";
import type { ApplicationId, UserId } from "@bystrobarista/core/types/ids";
import { classifyShiftLifecycle } from "@bystrobarista/core/utils/shiftLifecycle";
import { isEmploymentOpen } from "@bystrobarista/core/utils/employment";
import type { ShiftLifecycleStatus } from "@bystrobarista/core/types/application";
import { JobCard } from "@/components/JobCard";
import { ShiftCard, type ShiftEntry } from "@/components/ShiftCard";
import { MdiIcon } from "@/components/MdiIcon";
import { EmploymentCard } from "@/components/EmploymentCard";
import { EndEmploymentModal } from "@/components/EndEmploymentModal";
import { ReviewModal } from "@/components/ReviewModal";
import { useEmploymentActions } from "@/hooks/useEmploymentActions";

// Same persistence key as mobile BusinessHomeScreen's archive toggle.
const SHOW_ARCHIVED_KEY = "business.showArchivedJobs";

const ARCHIVED_STATUSES: JobStatus[] = ["filled", "expired", "cancelled"];
const ACTIVE_STATUSES: JobStatus[] = ["open", "in_review"];

const LIFECYCLE_TABS: Array<ShiftLifecycleStatus | "all"> = [
  "all",
  "open",
  "under_review",
  "accepted",
  "in_progress",
  "completed",
];

const pill = (active: boolean): string =>
  `flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium ${
    active
      ? "border-primary bg-primary text-white"
      : "border-line bg-white text-ink"
  }`;

const countBadge = (active: boolean): string =>
  `rounded-full px-1.5 text-xs font-semibold ${
    active ? "bg-white/25 text-white" : "bg-bg-secondary text-ink-secondary"
  }`;

// Web port of mobile's BusinessHomeScreen: jobs tab (status pills + archive
// toggle), shifts tab (lifecycle tabs over job+applications entries) and the
// staff tab (permanent hires with their lifecycle actions).
export default function DashboardPage(): React.JSX.Element {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<"jobs" | "shifts" | "staff">(
    "jobs",
  );
  const [selectedStatus, setSelectedStatus] = useState<JobStatus>("open");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedLifecycle, setSelectedLifecycle] = useState<
    ShiftLifecycleStatus | "all"
  >("all");
  const [includeArchive, setIncludeArchive] = useState(false);
  const [staffFilter, setStaffFilter] = useState<"active" | "ended">("active");
  const [endTarget, setEndTarget] = useState<{
    applicationId: ApplicationId;
    initialReason?: EmploymentEndReason;
  } | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{
    applicationId: ApplicationId;
    rateeId: UserId;
  } | null>(null);
  const employmentActions = useEmploymentActions();

  useEffect(() => {
    void getPlatform()
      .storage.getItem(SHOW_ARCHIVED_KEY)
      .then((v) => {
        if (v === "true") setShowArchived(true);
      })
      .catch(() => {});
  }, []);

  const toggleArchived = (next: boolean): void => {
    setShowArchived(next);
    if (!next && ARCHIVED_STATUSES.includes(selectedStatus)) {
      setSelectedStatus("open");
    }
    void getPlatform()
      .storage.setItem(SHOW_ARCHIVED_KEY, next ? "true" : "false")
      .catch(() => {});
  };

  const businessQuery = useQuery({
    queryKey: ["business", "byOwner", user?.id],
    queryFn: () => BusinessService.getBusinessByOwnerId(user?.id as string),
    enabled: Boolean(user?.id),
  });
  const businessId = businessQuery.data?.id;

  const jobsQuery = useQuery({
    queryKey: ["jobs", "byBusiness", businessId],
    queryFn: () => JobService.getJobsByBusinessId(businessId as string),
    enabled: Boolean(businessId),
  });

  const applicationsQuery = useQuery({
    queryKey: ["applications", "byBusiness", businessId],
    queryFn: () =>
      ApplicationService.getApplicationsByBusiness(businessId as string),
    enabled: Boolean(businessId) && activeTab === "shifts",
  });

  const employmentsQuery = useQuery({
    queryKey: ["employments", "byOwner", user?.id],
    queryFn: () => EmploymentService.getForBusinessOwner(user?.id as UserId),
    enabled: Boolean(user?.id) && activeTab === "staff",
  });

  const jobs = useMemo(() => jobsQuery.data ?? [], [jobsQuery.data]);

  const statusCounts = useMemo(() => {
    const counts = new Map<JobStatus, number>();
    for (const job of jobs) {
      counts.set(job.status, (counts.get(job.status) ?? 0) + 1);
    }
    return counts;
  }, [jobs]);

  const visibleStatuses = showArchived
    ? [...ACTIVE_STATUSES, ...ARCHIVED_STATUSES]
    : ACTIVE_STATUSES;
  const filteredJobs = jobs.filter((job) => job.status === selectedStatus);

  const shiftEntries = useMemo<ShiftEntry[]>(() => {
    const apps = applicationsQuery.data ?? [];
    const byJob = new Map<string, Application[]>();
    for (const app of apps) {
      const list = byJob.get(app.jobId) ?? [];
      list.push(app);
      byJob.set(app.jobId, list);
    }
    return jobs.map((job: Job) => {
      const jobApps = byJob.get(job.id) ?? [];
      return {
        job,
        applications: jobApps,
        lifecycle: classifyShiftLifecycle(job, jobApps),
      };
    });
  }, [jobs, applicationsQuery.data]);

  const lifecycleCounts = useMemo(() => {
    const counts = new Map<ShiftLifecycleStatus, number>();
    for (const entry of shiftEntries) {
      counts.set(entry.lifecycle, (counts.get(entry.lifecycle) ?? 0) + 1);
    }
    return counts;
  }, [shiftEntries]);

  const filteredShiftEntries = shiftEntries.filter((entry) => {
    if (selectedLifecycle !== "all") {
      return entry.lifecycle === selectedLifecycle;
    }
    if (!includeArchive && entry.lifecycle === "completed") return false;
    return true;
  });

  const employments = employmentsQuery.data ?? [];
  const openEmployments = employments.filter(isEmploymentOpen);
  const endedEmployments = employments.filter((e) => !isEmploymentOpen(e));
  const visibleEmployments =
    staffFilter === "active" ? openEmployments : endedEmployments;

  const handleConfirmEnd = async (employment: Employment): Promise<void> => {
    const ended = await employmentActions.confirmEnd(employment.applicationId);
    if (!ended) return;
    if (
      await employmentActions.isAlreadyReviewed(
        employment.applicationId,
        "business",
      )
    ) {
      return;
    }
    setReviewTarget({
      applicationId: employment.applicationId,
      rateeId: employment.baristaId,
    });
  };

  const isResolvingBusiness = businessQuery.isPending;

  if (!isResolvingBusiness && businessQuery.isSuccess && !businessId) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <MdiIcon
          path={mdiStorefrontOutline}
          size={56}
          className="mx-auto text-ink-secondary"
        />
        <p className="mt-4 text-lg font-semibold">{t("businessGate.title")}</p>
        <p className="mt-1 text-sm text-ink-secondary">
          {t("businessGate.subtitle")}
        </p>
        <Link
          href="/profile"
          data-tour="business.createCta"
          className="mt-4 inline-block rounded-card bg-primary px-5 py-2.5 text-sm font-semibold text-white"
        >
          {t("businessGate.cta")}
        </Link>
      </div>
    );
  }

  const isLoadingList =
    isResolvingBusiness ||
    jobsQuery.isPending ||
    (activeTab === "shifts" && applicationsQuery.isPending) ||
    (activeTab === "staff" && employmentsQuery.isPending);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("business.home.title")}</h1>
        <Link
          href="/jobs/new"
          data-tour="business.addJob"
          className="rounded-card bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          {t("manageJobs.create")}
        </Link>
      </div>

      <div
        data-tour="business.tabs"
        className="mb-4 flex rounded-card border border-line bg-white p-1"
      >
        {(["jobs", "shifts", "staff"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-input py-2 text-sm font-semibold ${
              activeTab === tab ? "bg-primary text-white" : "text-ink-secondary"
            }`}
          >
            {t(`business.tabs.${tab}`)}
          </button>
        ))}
      </div>

      {activeTab === "jobs" && (
        <>
          <label className="mb-3 flex items-center justify-between text-sm">
            {t("business.jobs.showArchived")}
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => toggleArchived(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
          </label>

          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {visibleStatuses.map((status) => {
              const active = selectedStatus === status;
              const count = statusCounts.get(status) ?? 0;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setSelectedStatus(status)}
                  className={pill(active)}
                >
                  {t(`business.jobs.status.${status}`)}
                  {count > 0 && (
                    <span className={countBadge(active)}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {isLoadingList ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="mb-3 h-36 animate-pulse rounded-card border border-line bg-bg-secondary"
              />
            ))
          ) : filteredJobs.length === 0 ? (
            <p className="py-16 text-center text-sm text-ink-secondary">
              {t("business.home.emptyJobs", {
                status: t(
                  `business.jobs.status.${selectedStatus}`,
                ).toLowerCase(),
              })}
            </p>
          ) : (
            filteredJobs.map((job, index) => (
              <JobCard
                key={job.id}
                job={job}
                tourKey={index === 0 ? "business.firstJob" : undefined}
              />
            ))
          )}
        </>
      )}

      {activeTab === "shifts" && (
        <>
          <label className="mb-3 flex items-center justify-between text-sm">
            {t("shifts.filter.includeArchive")}
            <input
              type="checkbox"
              checked={includeArchive}
              onChange={(e) => setIncludeArchive(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
          </label>

          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {LIFECYCLE_TABS.map((value) => {
              const active = selectedLifecycle === value;
              const count =
                value === "all"
                  ? shiftEntries.length
                  : (lifecycleCounts.get(value) ?? 0);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedLifecycle(value)}
                  className={pill(active)}
                >
                  {value === "all"
                    ? t("shifts.lifecycle.all")
                    : t(`shifts.status.${value}`)}
                  {count > 0 && (
                    <span className={countBadge(active)}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {isLoadingList ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="mb-3 h-28 animate-pulse rounded-card border border-line bg-bg-secondary"
              />
            ))
          ) : filteredShiftEntries.length === 0 ? (
            <p className="py-16 text-center text-sm text-ink-secondary">
              {t("shifts.empty")}
            </p>
          ) : (
            filteredShiftEntries.map((entry) => (
              <ShiftCard key={entry.job.id} entry={entry} />
            ))
          )}
        </>
      )}

      {activeTab === "staff" && (
        <>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {(["active", "ended"] as const).map((value) => {
              const active = staffFilter === value;
              const count =
                value === "active"
                  ? openEmployments.length
                  : endedEmployments.length;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStaffFilter(value)}
                  className={pill(active)}
                >
                  {t(
                    value === "active"
                      ? "employment.staff.filterActive"
                      : "employment.staff.filterEnded",
                  )}
                  {count > 0 && (
                    <span className={countBadge(active)}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {isLoadingList ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="mb-3 h-36 animate-pulse rounded-card border border-line bg-bg-secondary"
              />
            ))
          ) : employmentsQuery.isError ? (
            <p role="alert" className="py-16 text-center text-sm text-error">
              {t("employment.staff.loadFailed")}
            </p>
          ) : visibleEmployments.length === 0 ? (
            <p className="py-16 text-center text-sm text-ink-secondary">
              {t(
                staffFilter === "active"
                  ? "employment.staff.emptyActive"
                  : "employment.staff.emptyEnded",
              )}
            </p>
          ) : (
            visibleEmployments.map((employment) => (
              <EmploymentCard
                key={employment.id}
                employment={employment}
                busy={employmentActions.isBusy(employment.applicationId)}
                onConfirmStart={() =>
                  void employmentActions.confirmStart(employment.applicationId)
                }
                onRequestEnd={(initialReason) =>
                  setEndTarget({
                    applicationId: employment.applicationId,
                    initialReason,
                  })
                }
                onConfirmEnd={() => void handleConfirmEnd(employment)}
                onCancelEndRequest={() =>
                  void employmentActions.cancelEndRequest(
                    employment.applicationId,
                  )
                }
              />
            ))
          )}
        </>
      )}

      {endTarget && (
        <EndEmploymentModal
          open
          side="business"
          initialReason={endTarget.initialReason}
          onSubmit={async (reason, comment) => {
            await employmentActions.requestEnd({
              applicationId: endTarget.applicationId,
              reason,
              comment,
            });
            setEndTarget(null);
          }}
          onClose={() => setEndTarget(null)}
        />
      )}

      {reviewTarget && (
        <ReviewModal
          open
          applicationId={reviewTarget.applicationId}
          raterRole="business"
          rateeId={reviewTarget.rateeId}
          onSubmitted={() => setReviewTarget(null)}
          onSkip={() => setReviewTarget(null)}
        />
      )}
    </div>
  );
}
