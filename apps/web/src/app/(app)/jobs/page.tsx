"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";

// Placeholder for the shared jobs surface (barista feed / business manage).
// Phase 3 ports JobFeedScreen + ManageJobsScreen here, dispatched by role.
export default function JobsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  return (
    <div>
      <h1 className="text-2xl font-bold">{t("jobFeed.title")}</h1>
      <p className="mt-2 text-sm text-ink-secondary">
        {user?.email} · {user?.accountType}
      </p>
    </div>
  );
}
