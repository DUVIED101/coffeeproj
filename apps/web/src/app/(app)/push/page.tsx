"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect } from "react";
import { useAuthStore } from "@bystrobarista/core/stores/authStore";
import type { NotificationKind } from "@bystrobarista/core/types/notification";
import { notificationHref } from "@/lib/notificationRoute";

// Landing route for notification clicks from the service worker: the SW
// only knows kind + ids, this page knows the user's role, so the mapping to
// a screen (shared with the in-app feed) happens here.
function PushRouter(): React.JSX.Element {
  const router = useRouter();
  const params = useSearchParams();
  const accountType = useAuthStore((s) => s.user?.accountType);

  useEffect(() => {
    if (!accountType) return;
    const kind = params.get("kind") as NotificationKind | null;
    if (!kind) {
      router.replace("/notifications");
      return;
    }
    const action = params.get("action");
    router.replace(
      notificationHref(
        {
          kind,
          data: {
            kind,
            applicationId: (params.get("applicationId") ?? undefined) as never,
            conversationId: (params.get("conversationId") ??
              undefined) as never,
            jobId: (params.get("jobId") ?? undefined) as never,
            offerId: (params.get("offerId") ?? undefined) as never,
            disputeId: (params.get("disputeId") ?? undefined) as never,
            jobTitle: params.get("jobTitle") ?? undefined,
            shiftStartIso: params.get("shiftStartIso") ?? undefined,
          },
        },
        accountType,
        action === "accepted" || action === "declined" ? action : undefined,
      ),
    );
  }, [accountType, params, router]);

  return <div className="py-16 text-center text-sm text-ink-secondary">…</div>;
}

export default function PushPage(): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <PushRouter />
    </Suspense>
  );
}
