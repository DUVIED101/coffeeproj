"use client";

import { useParams } from "next/navigation";
import React from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { JobService } from "@bystrobarista/core/services/JobService";
import { JobCard } from "@/components/JobCard";

// Port of BusinessJobsScreen: all open jobs of one business.
export default function BusinessJobsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const params = useParams<{ ownerId: string }>();

  const jobsQuery = useQuery({
    queryKey: ["jobs", "byOwner", params.ownerId],
    queryFn: () => JobService.getJobsByOwnerId(params.ownerId),
  });

  const jobs = jobsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">
        {jobs[0]?.businessName ?? t("businessJobs.fallbackTitle")}
      </h1>

      {jobsQuery.isPending ? (
        <div className="h-40 animate-pulse rounded-card bg-bg-secondary" />
      ) : jobsQuery.isError ? (
        <p className="py-12 text-center text-ink-secondary">
          {t("businessJobs.loadFailedBody")}
        </p>
      ) : jobs.length === 0 ? (
        <div className="py-16 text-center">
          <p className="mb-1 text-lg font-semibold text-ink-secondary">
            {t("businessJobs.empty")}
          </p>
          <p className="text-sm text-ink-secondary">
            {t("businessJobs.emptySubtitle")}
          </p>
        </div>
      ) : (
        jobs.map((job) => <JobCard key={job.id} job={job} />)
      )}
    </div>
  );
}
