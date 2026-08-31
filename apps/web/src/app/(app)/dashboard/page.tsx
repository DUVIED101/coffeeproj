"use client";

import React from "react";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";

// Placeholder for the business home surface. Phase 4 ports
// BusinessHomeScreen here.
export default function DashboardPage(): React.JSX.Element {
  const user = useAuthStore((s) => s.user);

  return (
    <div>
      <h1 className="text-2xl font-bold">Дашборд</h1>
      <p className="mt-2 text-sm text-ink-secondary">
        {user?.email} · {user?.accountType}
      </p>
    </div>
  );
}
